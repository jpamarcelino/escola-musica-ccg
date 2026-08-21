// Estabilização do que se mostra no ecrã.
//
// O detetor entrega uma leitura por bloco de áudio, e essas leituras
// oscilam sempre um pouco — um vibrato, um dedo a assentar na corda, uma
// unha no braço. Pôr cada leitura diretamente no mostrador dá uma agulha
// aos saltos e uma nota a piscar entre duas vizinhas, que é exatamente o
// que torna um afinador inútil na prática.
//
// Três mecanismos, cada um para um problema diferente:
//
//  - a *mediana* de uma janela curta mata os disparates isolados, coisa
//    que uma média não faz (uma leitura absurda arrasta a média);
//  - a *suavização exponencial* dá à agulha um movimento contínuo em vez
//    de degraus;
//  - a *histerese* impede que a nota apresentada troque de nome de cada
//    vez que se passa a fronteira dos 50 cents.
//
// Não guarda áudio nenhum: só frequências já calculadas.

import { midiDaFrequencia } from './afinacao'
import { RMS_MINIMO } from './deteccao-tom'
import type { Leitura } from './deteccao-tom'

/** Quanto tempo de leituras entra na mediana. */
export const JANELA_MS = 220

/** Quantas leituras são precisas antes de mostrar seja o que for. */
export const LEITURAS_MINIMAS = 3

/**
 * Peso da leitura nova na suavização exponencial da frequência.
 *
 * 0,35 responde depressa a uma corda que se afina e continua a limpar o
 * tremido. Mais alto volta a saltitar; mais baixo dá a sensação de a
 * agulha estar atrasada em relação ao que se ouve.
 */
export const SUAVIZACAO = 0.35

/**
 * Quantos cents é preciso estar fora da nota atual para se aceitar outra.
 *
 * A fronteira natural entre duas notas são 50 cents. Exigir 65 cria uma
 * zona morta de 15 cents onde a nota apresentada não muda — é isto que
 * impede o piscar entre, digamos, Lá e Lá♯ em quem toca com vibrato.
 */
export const HISTERESE_CENTS = 65

/** Quantas leituras seguidas a pedir outra nota antes de a trocar. */
export const LEITURAS_PARA_TROCAR = 3

/** Quanto tempo se conserva a última nota depois de o som desaparecer. */
export const SEGURAR_MS = 700

/**
 * A partir de que distância se considera que mudou de nota, e não que a
 * mesma nota se moveu.
 *
 * A suavização é boa a limpar o tremido dentro de uma nota e péssima a
 * acompanhar um salto: passar de um Lá para um Mi levava-a meio segundo
 * a lá chegar, e durante esse tempo o mostrador dizia frequências que
 * ninguém tocou. Acima de um tom, salta-se em vez de deslizar.
 */
export const SALTO_CENTS = 200

export type SaidaAfinador =
  | { tipo: 'a-ouvir' }
  | { tipo: 'sinal-fraco' }
  | { tipo: 'incerto' }
  | { tipo: 'nota'; frequencia: number; midi: number; clareza: number; segurada: boolean }

type Amostra = { frequencia: number; instante: number }

export type Estabilizador = {
  registar(leitura: Leitura, instante: number, a4?: number): SaidaAfinador
  reiniciar(): void
}

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 === 1
    ? ordenados[meio]
    : (ordenados[meio - 1] + ordenados[meio]) / 2
}

export function criarEstabilizador(
  opcoes: {
    janelaMs?: number
    leiturasMinimas?: number
    suavizacao?: number
    histereseCents?: number
    leiturasParaTrocar?: number
    segurarMs?: number
    saltoCents?: number
  } = {},
): Estabilizador {
  const janelaMs = opcoes.janelaMs ?? JANELA_MS
  const leiturasMinimas = opcoes.leiturasMinimas ?? LEITURAS_MINIMAS
  const suavizacao = opcoes.suavizacao ?? SUAVIZACAO
  const histereseCents = opcoes.histereseCents ?? HISTERESE_CENTS
  const leiturasParaTrocar = opcoes.leiturasParaTrocar ?? LEITURAS_PARA_TROCAR
  const segurarMs = opcoes.segurarMs ?? SEGURAR_MS
  const saltoCents = opcoes.saltoCents ?? SALTO_CENTS

  let amostras: Amostra[] = []
  let suavizada: number | null = null
  let midiAtual: number | null = null
  let candidato: number | null = null
  let vezesSeguidas = 0
  let ultimaBoa = -Infinity
  let ultimaClareza = 0

  // Enquanto o som acabou de desaparecer, continua a mostrar-se a última
  // nota. Sem isto, largar a corda apagava o mostrador no instante em que
  // a pessoa olha para ele para ver se ficou afinada.
  function segurarOuDesistir(instante: number, alternativa: SaidaAfinador): SaidaAfinador {
    if (midiAtual !== null && suavizada !== null && instante - ultimaBoa <= segurarMs) {
      return {
        tipo: 'nota',
        frequencia: suavizada,
        midi: midiAtual,
        clareza: ultimaClareza,
        segurada: true,
      }
    }
    reiniciar()
    return alternativa
  }

  function reiniciar() {
    amostras = []
    suavizada = null
    midiAtual = null
    candidato = null
    vezesSeguidas = 0
    ultimaBoa = -Infinity
    ultimaClareza = 0
  }

  return {
    reiniciar,
    registar(leitura, instante, a4) {
      if (leitura.frequencia === null) {
        // Distinguir "não há som" de "há som mas não percebo" — são duas
        // mensagens diferentes para o utilizador, e confundi-las manda
        // alguém tocar mais alto quando o problema é o ruído da sala.
        const semSinal = leitura.rms < RMS_MINIMO
        return segurarOuDesistir(instante, { tipo: semSinal ? 'sinal-fraco' : 'incerto' })
      }

      amostras.push({ frequencia: leitura.frequencia, instante })
      const dentroDaJanela = amostras.filter((a) => instante - a.instante <= janelaMs)
      // A janela é de tempo, mas com uma rede por baixo: se as leituras
      // chegarem mais devagar do que ela (um dispositivo lento, um
      // separador com os temporizadores travados pelo browser), a janela
      // deita fora tudo menos a última e o afinador nunca sai de "a
      // ouvir" — mostra-se ligado e não diz nada, que é o pior dos
      // mundos. Quando isso acontece, vale o número de leituras em vez
      // do tempo: melhor uma mediana sobre leituras mais espaçadas do
      // que mostrador nenhum.
      amostras =
        dentroDaJanela.length >= leiturasMinimas
          ? dentroDaJanela
          : amostras.slice(-leiturasMinimas)
      ultimaBoa = instante
      ultimaClareza = leitura.clareza

      // Aqui não se chama o segurarOuDesistir: ele limpa o estado, e o
      // que falta é justamente acumular amostras. Limpá-las a cada volta
      // fazia com que nunca chegassem ao mínimo e o afinador ficasse
      // eternamente em "a ouvir".
      if (amostras.length < leiturasMinimas) return { tipo: 'a-ouvir' }

      const central = mediana(amostras.map((a) => a.frequencia))
      const salto =
        suavizada !== null && Math.abs(1200 * Math.log2(central / suavizada)) > saltoCents
      suavizada =
        suavizada === null || salto ? central : suavizada + suavizacao * (central - suavizada)

      const midiExato = midiDaFrequencia(suavizada, a4)
      const midiLido = Math.round(midiExato)

      if (midiAtual === null) {
        midiAtual = midiLido
        candidato = null
        vezesSeguidas = 0
      } else if (midiLido !== midiAtual) {
        // Só se troca de nota quando o sinal está mesmo longe da atual e
        // insiste nisso. Uma leitura solitária a 51 cents não chega.
        const centsDaAtual = Math.abs((midiExato - midiAtual) * 100)
        if (centsDaAtual > histereseCents) {
          if (candidato === midiLido) vezesSeguidas++
          else {
            candidato = midiLido
            vezesSeguidas = 1
          }
          if (vezesSeguidas >= leiturasParaTrocar) {
            midiAtual = midiLido
            candidato = null
            vezesSeguidas = 0
          }
        } else {
          candidato = null
          vezesSeguidas = 0
        }
      } else {
        candidato = null
        vezesSeguidas = 0
      }

      return {
        tipo: 'nota',
        frequencia: suavizada,
        midi: midiAtual,
        clareza: leitura.clareza,
        segurada: false,
      }
    },
  }
}
