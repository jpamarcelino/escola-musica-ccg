// Deteção de tom monofónica pelo método de McLeod (MPM).
//
// Porquê este e não o pico maior de uma FFT: numa corda grave de baixo,
// o primeiro harmónico costuma ter mais energia do que a fundamental, e
// um detetor que escolhe o pico mais alto do espetro anuncia a oitava
// acima. O MPM trabalha sobre a autocorrelação normalizada (NSDF) e não
// escolhe o pico mais alto — escolhe o *primeiro* pico que chega perto
// do máximo, que é sempre o período verdadeiro e não um seu múltiplo.
//
// O YIN resolveria o mesmo problema com qualidade equivalente. Escolhi o
// MPM porque a altura do pico da NSDF é, sem contas adicionais, um número
// entre 0 e 1 que mede quão periódico é o sinal — é a "clareza", e é ela
// que permite recusar ruído em vez de inventar uma nota.

import { autocorrelacao } from './fft'

/** Abaixo deste RMS considera-se que não está a entrar sinal útil. */
export const RMS_MINIMO = 0.008

/**
 * Abaixo desta clareza o resultado não se mostra.
 *
 * 0,9 é apertado de propósito: numa sala com algum ruído, um valor
 * permissivo dá notas a saltar com o ar condicionado. Mais vale dizer
 * "não estou a perceber" do que apresentar um resultado inventado.
 */
export const CLAREZA_MINIMA = 0.9

/**
 * Fração do pico máximo a partir da qual um pico serve.
 *
 * É o coração do MPM. Com 1,0 escolhia-se sempre o máximo absoluto e
 * voltavam os erros de oitava; abaixo de 0,8 começa a apanhar-se picos
 * de meio período e a nota sai uma oitava abaixo.
 */
const LIMIAR_PICO = 0.9

/** A gama útil: do Si0 de um baixo de cinco cordas ao topo de um violino. */
export const FREQ_MIN = 35
export const FREQ_MAX = 2000

export type Leitura = {
  /** Hertz, ou null quando não há nada fiável. */
  frequencia: number | null
  /** 0 a 1: quão periódico é o sinal. */
  clareza: number
  /** Volume do bloco analisado. */
  rms: number
}

function calcularRms(amostras: Float32Array): number {
  let soma = 0
  for (let i = 0; i < amostras.length; i++) soma += amostras[i] * amostras[i]
  return Math.sqrt(soma / amostras.length)
}

// Tira a componente contínua. Muitos microfones de telemóvel entregam o
// sinal com um desvio constante, e esse desvio é, para a autocorrelação,
// energia a frequência zero — puxa a NSDF toda para cima e esbate os
// picos que interessam.
function semComponenteContinua(amostras: Float32Array): Float32Array {
  let media = 0
  for (let i = 0; i < amostras.length; i++) media += amostras[i]
  media /= amostras.length
  const saida = new Float32Array(amostras.length)
  for (let i = 0; i < amostras.length; i++) saida[i] = amostras[i] - media
  return saida
}

// Interpolação parabólica pelos três pontos à volta do pico.
//
// Sem isto, o período só pode ser um número inteiro de amostras, e a
// 1000 Hz com 48 kHz um erro de meia amostra são uns 8 cents. Com ela o
// erro cai para bem menos de um cent.
function refinarPico(nsdf: Float64Array, i: number): { posicao: number; valor: number } {
  if (i <= 0 || i >= nsdf.length - 1) return { posicao: i, valor: nsdf[i] }
  const y1 = nsdf[i - 1]
  const y2 = nsdf[i]
  const y3 = nsdf[i + 1]
  const a = (y1 + y3 - 2 * y2) / 2
  const b = (y3 - y1) / 2
  if (a === 0) return { posicao: i, valor: y2 }
  const desvio = -b / (2 * a)
  return { posicao: i + desvio, valor: y2 - (b * b) / (4 * a) }
}

export function detetarTom(
  amostras: Float32Array,
  taxaAmostragem: number,
  opcoes: { freqMin?: number; freqMax?: number; clarezaMinima?: number; rmsMinimo?: number } = {},
): Leitura {
  const freqMin = opcoes.freqMin ?? FREQ_MIN
  const freqMax = opcoes.freqMax ?? FREQ_MAX
  const clarezaMinima = opcoes.clarezaMinima ?? CLAREZA_MINIMA
  const rmsMinimo = opcoes.rmsMinimo ?? RMS_MINIMO

  const rms = calcularRms(amostras)
  // Limiar de volume antes de qualquer conta: em silêncio, o que resta é
  // o ruído do próprio microfone, e correlacionar ruído dá sempre algum
  // pico. Sair já é mais barato e mais honesto.
  if (rms < rmsMinimo) return { frequencia: null, clareza: 0, rms }

  const x = semComponenteContinua(amostras)
  const n = x.length
  const r = autocorrelacao(x)

  // m(t) = soma de x[j]² + x[j+t]², a normalização do MPM. Com somas
  // acumuladas sai em tempo constante por atraso em vez de refazer a
  // soma toda de cada vez.
  const acumulado = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) acumulado[i + 1] = acumulado[i] + x[i] * x[i]

  const atrasoMin = Math.max(2, Math.floor(taxaAmostragem / freqMax))
  const atrasoMax = Math.min(n - 2, Math.ceil(taxaAmostragem / freqMin))
  if (atrasoMax <= atrasoMin) return { frequencia: null, clareza: 0, rms }

  const nsdf = new Float64Array(atrasoMax + 2)
  for (let t = 0; t < nsdf.length; t++) {
    const m = acumulado[n - t] + (acumulado[n] - acumulado[t])
    nsdf[t] = m > 0 ? (2 * r[t]) / m : 0
  }

  // Passar o lobo central: a NSDF vale 1 no atraso zero e desce daí. O
  // primeiro candidato só existe depois de ela cruzar o zero.
  let t = 0
  while (t < atrasoMax && nsdf[t] > 0) t++

  // Um máximo por cada troço positivo — são os "key maxima" do McLeod.
  const picos: number[] = []
  while (t < atrasoMax) {
    if (nsdf[t] > 0 && nsdf[t - 1] <= 0) {
      let melhor = t
      while (t < atrasoMax && nsdf[t] > 0) {
        if (nsdf[t] > nsdf[melhor]) melhor = t
        t++
      }
      if (melhor >= atrasoMin) picos.push(melhor)
    } else {
      t++
    }
  }

  if (picos.length === 0) return { frequencia: null, clareza: 0, rms }

  let maximo = 0
  for (const p of picos) if (nsdf[p] > maximo) maximo = nsdf[p]
  if (maximo <= 0) return { frequencia: null, clareza: 0, rms }

  // O primeiro que chega perto do máximo, não o máximo. É esta linha que
  // separa o período da sua oitava.
  const limiar = LIMIAR_PICO * maximo
  const escolhido = picos.find((p) => nsdf[p] >= limiar)
  if (escolhido === undefined) return { frequencia: null, clareza: 0, rms }

  const { posicao, valor } = refinarPico(nsdf, escolhido)
  const clareza = Math.max(0, Math.min(1, valor))
  if (posicao <= 0) return { frequencia: null, clareza, rms }

  const frequencia = taxaAmostragem / posicao
  if (frequencia < freqMin || frequencia > freqMax) return { frequencia: null, clareza, rms }
  if (clareza < clarezaMinima) return { frequencia: null, clareza, rms }

  return { frequencia, clareza, rms }
}
