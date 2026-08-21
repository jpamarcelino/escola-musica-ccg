// Frequência → nota, oitava e desvio em cents.
//
// Aritmética pura, sem áudio: recebe um número em hertz e devolve o que
// se escreve no ecrã. Separado da deteção de propósito — esta parte
// testa-se com valores de tabela e é onde um erro passaria despercebido
// mais tempo.

// A referência do Lá4. 440 Hz é a norma ISO 16, mas há orquestras a 442
// e conjuntos de música antiga bem mais abaixo, daí ser configurável.
export const A4_PADRAO = 440
export const A4_MIN = 430
export const A4_MAX = 450

// Dentro de quantos cents se considera a nota afinada.
//
// Três é exigente mas honesto: o ouvido treinado distingue cerca de 5
// cents em notas sustentadas, e um afinador que diz "afinado" a 10 cents
// deixa uma guitarra audivelmente desafinada em acordes. Está aqui em
// cima, sozinho, para se mexer numa linha.
export const CENTS_AFINADO = 3

// O intervalo do mostrador, em cents. Meio tom para cada lado: passado
// isto, a nota mais próxima passa a ser outra e a agulha deixa de querer
// dizer alguma coisa.
export const CENTS_ESCALA = 50

// Nomes latinos, que é como se lê numa escola de música portuguesa. As
// letras vão à frente em pequeno, para quem toca guitarra e aprendeu a
// pensar em E-A-D-G-B-E.
const NOMES_SUSTENIDOS = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si']
const NOMES_BEMOIS = ['Dó', 'Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Sol♭', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si']
const LETRAS_SUSTENIDOS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const LETRAS_BEMOIS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']

// O Lá4 é o número 69 na numeração MIDI, e é a âncora de tudo o resto.
const MIDI_DO_LA4 = 69

export type Acidente = 'sustenidos' | 'bemois'

export type Nota = {
  /** Número MIDI da nota mais próxima. Lá4 = 69. */
  midi: number
  /** "Dó♯", "Si♭"… conforme a preferência de acidentes. */
  nome: string
  /** "C♯", "B♭" — a mesma nota em letras. */
  letra: string
  /** Oitava científica: o Dó central é o 4. */
  oitava: number
  /** A frequência que foi mesmo detetada. */
  frequencia: number
  /** A frequência a que essa nota devia estar, com a referência em uso. */
  alvo: number
  /** Desvio em cents: negativo é grave, positivo é agudo. */
  cents: number
}

export type Direcao = 'grave' | 'afinado' | 'agudo'

/** Número MIDI (fracionário) de uma frequência. */
export function midiDaFrequencia(frequencia: number, a4 = A4_PADRAO): number {
  return MIDI_DO_LA4 + 12 * Math.log2(frequencia / a4)
}

/** A frequência exata de um número MIDI. */
export function frequenciaDoMidi(midi: number, a4 = A4_PADRAO): number {
  return a4 * Math.pow(2, (midi - MIDI_DO_LA4) / 12)
}

/**
 * Descreve uma frequência *em relação a uma nota escolhida*.
 *
 * Existe separada da notaDaFrequencia porque o afinador não quer sempre
 * a nota mais próxima: o estabilizador fixa uma nota e segura-a, e
 * enquanto a segura o desvio tem de ser medido contra essa e não contra
 * a vizinha. Sem isto, o nome no ecrã ficava estável e os cents saltavam
 * para o outro lado ao passar os 50 — exatamente o que a histerese
 * estava a tentar evitar.
 */
export function afinacaoRelativa(
  midi: number,
  frequencia: number,
  opcoes: { a4?: number; acidente?: Acidente } = {},
): Nota | null {
  const a4 = opcoes.a4 ?? A4_PADRAO
  if (!Number.isFinite(frequencia) || frequencia <= 0) return null
  if (!Number.isFinite(midi)) return null

  const alvo = frequenciaDoMidi(midi, a4)
  const classe = ((midi % 12) + 12) % 12
  const bemois = opcoes.acidente === 'bemois'

  return {
    midi,
    nome: (bemois ? NOMES_BEMOIS : NOMES_SUSTENIDOS)[classe],
    letra: (bemois ? LETRAS_BEMOIS : LETRAS_SUSTENIDOS)[classe],
    // Dó4 é o MIDI 60, por isso a oitava é o andar de doze abaixo de -1.
    oitava: Math.floor(midi / 12) - 1,
    frequencia,
    alvo,
    cents: 1200 * Math.log2(frequencia / alvo),
  }
}

/** A nota mais próxima de uma frequência. */
export function notaDaFrequencia(
  frequencia: number,
  opcoes: { a4?: number; acidente?: Acidente } = {},
): Nota | null {
  const a4 = opcoes.a4 ?? A4_PADRAO
  // Zero e negativos não são frequências, e log2(0) é -Infinito — sem
  // esta guarda saía uma nota com oitava -Infinity em vez de um erro.
  if (!Number.isFinite(frequencia) || frequencia <= 0) return null
  return afinacaoRelativa(Math.round(midiDaFrequencia(frequencia, a4)), frequencia, opcoes)
}

export function direcaoDaAfinacao(cents: number, tolerancia = CENTS_AFINADO): Direcao {
  if (Math.abs(cents) <= tolerancia) return 'afinado'
  return cents < 0 ? 'grave' : 'agudo'
}

// O texto que acompanha a cor. A cor sozinha não serve a quem não a
// distingue, e "afinado" tem de se poder ler.
export function textoDaDirecao(direcao: Direcao): string {
  if (direcao === 'afinado') return 'Afinado'
  return direcao === 'grave' ? 'Demasiado grave' : 'Demasiado agudo'
}
