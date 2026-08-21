import { describe, expect, it } from 'vitest'
import {
  A4_PADRAO,
  afinacaoRelativa,
  CENTS_AFINADO,
  direcaoDaAfinacao,
  frequenciaDoMidi,
  midiDaFrequencia,
  notaDaFrequencia,
  textoDaDirecao,
} from './afinacao'

describe('notaDaFrequencia', () => {
  it('440 Hz é o Lá4, sem desvio', () => {
    const n = notaDaFrequencia(440)!
    expect(n.nome).toBe('Lá')
    expect(n.letra).toBe('A')
    expect(n.oitava).toBe(4)
    expect(n.midi).toBe(69)
    expect(n.cents).toBeCloseTo(0, 6)
    expect(n.alvo).toBeCloseTo(440, 6)
  })

  it.each([
    [261.6256, 'Dó', 'C', 4, 60],
    [130.8128, 'Dó', 'C', 3, 48],
    [82.4069, 'Mi', 'E', 2, 40],
    [41.2034, 'Mi', 'E', 1, 28],
    [329.6276, 'Mi', 'E', 4, 64],
    [196.0, 'Sol', 'G', 3, 55],
    [1975.533, 'Si', 'B', 6, 95],
    [27.5, 'Lá', 'A', 0, 21],
  ])('%d Hz é %s%d', (freq, nome, letra, oitava, midi) => {
    const n = notaDaFrequencia(freq as number)!
    expect(n.nome).toBe(nome)
    expect(n.letra).toBe(letra)
    expect(n.oitava).toBe(oitava)
    expect(n.midi).toBe(midi)
    expect(Math.abs(n.cents)).toBeLessThan(1)
  })

  it('mostra sustenidos ou bemóis conforme se pedir', () => {
    const sus = notaDaFrequencia(466.16)!
    expect(sus.nome).toBe('Lá♯')
    expect(sus.letra).toBe('A♯')
    const bem = notaDaFrequencia(466.16, { acidente: 'bemois' })!
    expect(bem.nome).toBe('Si♭')
    expect(bem.letra).toBe('B♭')
    // A nota é a mesma; só muda como se escreve.
    expect(bem.midi).toBe(sus.midi)
  })

  it('conta cents negativos quando está grave', () => {
    // Meio tom são 100 cents; um quarto de tom, 50.
    const n = notaDaFrequencia(440 * Math.pow(2, -25 / 1200))!
    expect(n.midi).toBe(69)
    expect(n.cents).toBeCloseTo(-25, 3)
  })

  it('conta cents positivos quando está agudo', () => {
    const n = notaDaFrequencia(440 * Math.pow(2, 30 / 1200))!
    expect(n.midi).toBe(69)
    expect(n.cents).toBeCloseTo(30, 3)
  })

  it('nunca passa de meio tom de desvio, porque salta para a nota vizinha', () => {
    for (let cents = -49; cents <= 49; cents += 7) {
      const n = notaDaFrequencia(440 * Math.pow(2, cents / 1200))!
      expect(n.midi).toBe(69)
      expect(n.cents).toBeCloseTo(cents, 3)
    }
    const acima = notaDaFrequencia(440 * Math.pow(2, 60 / 1200))!
    expect(acima.midi).toBe(70)
    expect(acima.cents).toBeCloseTo(-40, 3)
  })

  it('recusa frequências impossíveis em vez de devolver disparates', () => {
    expect(notaDaFrequencia(0)).toBeNull()
    expect(notaDaFrequencia(-100)).toBeNull()
    expect(notaDaFrequencia(Number.NaN)).toBeNull()
    expect(notaDaFrequencia(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('referência do Lá4 diferente de 440', () => {
  it('a 442 Hz, o Lá4 é 442 e o antigo 440 passa a estar grave', () => {
    const n = notaDaFrequencia(442, { a4: 442 })!
    expect(n.midi).toBe(69)
    expect(n.cents).toBeCloseTo(0, 6)

    const antigo = notaDaFrequencia(440, { a4: 442 })!
    expect(antigo.midi).toBe(69)
    expect(antigo.cents).toBeCloseTo(1200 * Math.log2(440 / 442), 6)
    expect(antigo.cents).toBeLessThan(0)
  })

  it('a 432 Hz, toda a escala desce junto', () => {
    const n = notaDaFrequencia(432 * Math.pow(2, -9 / 12), { a4: 432 })!
    expect(n.nome).toBe('Dó')
    expect(n.oitava).toBe(4)
    expect(Math.abs(n.cents)).toBeLessThan(0.001)
  })

  it('o alvo acompanha a referência', () => {
    expect(notaDaFrequencia(440, { a4: 430 })!.alvo).toBeCloseTo(430, 6)
    expect(notaDaFrequencia(440, { a4: 450 })!.alvo).toBeCloseTo(450, 6)
  })
})

describe('midi e frequência são um o inverso do outro', () => {
  it.each([21, 28, 40, 60, 69, 88, 95])('ida e volta no MIDI %d', (midi) => {
    expect(midiDaFrequencia(frequenciaDoMidi(midi), A4_PADRAO)).toBeCloseTo(midi, 9)
  })
})

describe('direção da afinação', () => {
  it('dentro da tolerância diz afinado', () => {
    expect(direcaoDaAfinacao(0)).toBe('afinado')
    expect(direcaoDaAfinacao(CENTS_AFINADO)).toBe('afinado')
    expect(direcaoDaAfinacao(-CENTS_AFINADO)).toBe('afinado')
  })

  it('fora da tolerância diz para que lado', () => {
    expect(direcaoDaAfinacao(CENTS_AFINADO + 0.5)).toBe('agudo')
    expect(direcaoDaAfinacao(-CENTS_AFINADO - 0.5)).toBe('grave')
  })

  it('a tolerância é ajustável', () => {
    expect(direcaoDaAfinacao(8, 10)).toBe('afinado')
    expect(direcaoDaAfinacao(8, 5)).toBe('agudo')
  })

  it('há sempre texto, e não só cor', () => {
    expect(textoDaDirecao('afinado')).toBe('Afinado')
    expect(textoDaDirecao('grave')).toContain('grave')
    expect(textoDaDirecao('agudo')).toContain('agudo')
  })
})

describe('afinacaoRelativa', () => {
  it('mede o desvio contra a nota que lhe derem, não contra a mais próxima', () => {
    // 70 cents acima do Lá4: a nota mais próxima já é o Lá♯, mas se o
    // afinador ainda está a segurar o Lá, é do Lá que se mede.
    const f = 440 * Math.pow(2, 70 / 1200)
    expect(notaDaFrequencia(f)!.midi).toBe(70)

    const preso = afinacaoRelativa(69, f)!
    expect(preso.midi).toBe(69)
    expect(preso.nome).toBe('Lá')
    expect(preso.cents).toBeCloseTo(70, 3)
  })

  it('respeita a referência do Lá4', () => {
    const preso = afinacaoRelativa(69, 442, { a4: 442 })!
    expect(preso.cents).toBeCloseTo(0, 6)
    expect(preso.alvo).toBeCloseTo(442, 6)
  })

  it('recusa entradas impossíveis', () => {
    expect(afinacaoRelativa(69, 0)).toBeNull()
    expect(afinacaoRelativa(Number.NaN, 440)).toBeNull()
  })
})
