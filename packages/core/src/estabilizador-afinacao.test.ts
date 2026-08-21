import { describe, expect, it } from 'vitest'
import { criarEstabilizador, SEGURAR_MS } from './estabilizador-afinacao'
import { frequenciaDoMidi } from './afinacao'
import type { Leitura } from './deteccao-tom'

const PASSO = 50 // ms entre leituras, ~20 por segundo

function boa(frequencia: number): Leitura {
  return { frequencia, clareza: 0.97, rms: 0.05 }
}
const SILENCIO: Leitura = { frequencia: null, clareza: 0, rms: 0 }
const RUIDO: Leitura = { frequencia: null, clareza: 0.4, rms: 0.05 }

// Corre uma sequência de leituras e devolve o que saiu de cada uma.
function correr(leituras: Leitura[], est = criarEstabilizador(), inicio = 1000) {
  return leituras.map((l, i) => est.registar(l, inicio + i * PASSO))
}

describe('arranque', () => {
  it('diz "a ouvir" até ter leituras que cheguem', () => {
    const saidas = correr([boa(440), boa(440)])
    expect(saidas.every((s) => s.tipo === 'a-ouvir')).toBe(true)
  })

  it('mostra a nota à terceira leitura', () => {
    const saidas = correr([boa(440), boa(440), boa(440)])
    const ultima = saidas[2]
    expect(ultima.tipo).toBe('nota')
    if (ultima.tipo === 'nota') {
      expect(ultima.midi).toBe(69)
      expect(ultima.segurada).toBe(false)
    }
  })
})

describe('recusa', () => {
  it('sem som, diz sinal fraco', () => {
    const saidas = correr([SILENCIO, SILENCIO, SILENCIO])
    expect(saidas.every((s) => s.tipo === 'sinal-fraco')).toBe(true)
  })

  it('com som mas sem nota fiável, diz incerto e não inventa', () => {
    const saidas = correr([RUIDO, RUIDO, RUIDO])
    expect(saidas.every((s) => s.tipo === 'incerto')).toBe(true)
  })
})

describe('estabilidade da nota', () => {
  it('não pisca entre duas notas vizinhas quando o sinal treme na fronteira', () => {
    // Vibrato à volta da fronteira Lá4/Lá♯4: ±45 cents do Lá.
    const est = criarEstabilizador()
    const leituras: Leitura[] = []
    for (let i = 0; i < 40; i++) {
      const cents = 45 * Math.sin(i / 2)
      leituras.push(boa(440 * Math.pow(2, cents / 1200)))
    }
    const saidas = correr(leituras, est)
    const notas = saidas.filter((s) => s.tipo === 'nota')
    expect(notas.length).toBeGreaterThan(30)
    const midis = new Set(notas.map((s) => (s.tipo === 'nota' ? s.midi : 0)))
    expect(midis).toEqual(new Set([69]))
  })

  it('uma leitura disparatada isolada não desvia o resultado', () => {
    const est = criarEstabilizador()
    correr([boa(440), boa(440), boa(440)], est)
    // Um pico solitário duas oitavas acima, como um estalo.
    const s = est.registar(boa(1760), 1000 + 3 * PASSO)
    expect(s.tipo).toBe('nota')
    if (s.tipo === 'nota') expect(s.midi).toBe(69)
  })

  it('troca de nota quando se toca mesmo outra corda', () => {
    const est = criarEstabilizador()
    correr(Array(6).fill(boa(440)), est)
    const mi = frequenciaDoMidi(64) // Mi4
    let ultima = null
    for (let i = 0; i < 10; i++) {
      ultima = est.registar(boa(mi), 2000 + i * PASSO)
    }
    expect(ultima!.tipo).toBe('nota')
    if (ultima!.tipo === 'nota') {
      expect(ultima!.midi).toBe(64)
      // E a frequência mostrada é mesmo a nova, não um valor a meio
      // caminho deixado pela suavização.
      expect(Math.abs(1200 * Math.log2(ultima!.frequencia / mi))).toBeLessThan(2)
    }
  })

  it('a troca não acontece à primeira leitura, mas acontece depressa', () => {
    const est = criarEstabilizador()
    correr(Array(6).fill(boa(440)), est)
    const mi = frequenciaDoMidi(64)
    const midis: number[] = []
    for (let i = 0; i < 8; i++) {
      const s = est.registar(boa(mi), 2000 + i * PASSO)
      if (s.tipo === 'nota') midis.push(s.midi)
    }
    expect(midis[0]).toBe(69)
    // Dentro de meia dúzia de leituras — cerca de três décimos de segundo.
    expect(midis[midis.length - 1]).toBe(64)
    expect(midis.filter((m) => m === 69).length).toBeLessThanOrEqual(4)
  })
})

describe('suavização', () => {
  it('a agulha converge para o valor certo em vez de saltar com o ruído', () => {
    const est = criarEstabilizador()
    let ultima = null
    for (let i = 0; i < 25; i++) {
      // ±6 cents de tremido em cima de 220 Hz.
      const cents = (i % 2 === 0 ? 6 : -6) + (i % 3) - 1
      ultima = est.registar(boa(220 * Math.pow(2, cents / 1200)), 3000 + i * PASSO)
    }
    expect(ultima!.tipo).toBe('nota')
    if (ultima!.tipo === 'nota') {
      expect(Math.abs(1200 * Math.log2(ultima!.frequencia / 220))).toBeLessThan(6)
    }
  })
})

describe('quando o som desaparece', () => {
  it('segura a última nota durante um instante', () => {
    const est = criarEstabilizador()
    correr(Array(5).fill(boa(440)), est)
    const s = est.registar(SILENCIO, 1000 + 5 * PASSO)
    expect(s.tipo).toBe('nota')
    if (s.tipo === 'nota') {
      expect(s.midi).toBe(69)
      // E assume que está a segurar, para o ecrã o poder dizer.
      expect(s.segurada).toBe(true)
    }
  })

  it('desiste passado o tempo de espera e volta a "a ouvir"', () => {
    const est = criarEstabilizador()
    const t0 = 1000
    for (let i = 0; i < 5; i++) est.registar(boa(440), t0 + i * PASSO)
    const fim = t0 + 4 * PASSO
    expect(est.registar(SILENCIO, fim + SEGURAR_MS - 10).tipo).toBe('nota')
    expect(est.registar(SILENCIO, fim + SEGURAR_MS + 10).tipo).toBe('sinal-fraco')
  })

  it('depois de desistir, começa do princípio', () => {
    const est = criarEstabilizador()
    for (let i = 0; i < 5; i++) est.registar(boa(440), 1000 + i * PASSO)
    est.registar(SILENCIO, 5000)
    // Uma só leitura não chega para voltar a mostrar nota.
    expect(est.registar(boa(440), 5050).tipo).toBe('a-ouvir')
  })

  it('reiniciar limpa tudo', () => {
    const est = criarEstabilizador()
    for (let i = 0; i < 5; i++) est.registar(boa(440), 1000 + i * PASSO)
    est.reiniciar()
    expect(est.registar(boa(440), 1300).tipo).toBe('a-ouvir')
  })
})

describe('referência do Lá4', () => {
  it('a nota estabilizada respeita a referência em uso', () => {
    const est = criarEstabilizador()
    let ultima = null
    // 432 Hz com a referência a 432 é o Lá4, não um Lá4 desafinado.
    for (let i = 0; i < 5; i++) ultima = est.registar(boa(432), 1000 + i * PASSO, 432)
    expect(ultima!.tipo).toBe('nota')
    if (ultima!.tipo === 'nota') expect(ultima!.midi).toBe(69)
  })
})

describe('leituras mais lentas do que a janela', () => {
  it('mostra a nota à mesma, em vez de ficar preso em "a ouvir"', () => {
    // Um segundo entre leituras: muito mais do que a janela de 220 ms.
    // Acontece quando o browser trava os temporizadores.
    const est = criarEstabilizador()
    let ultima = null
    for (let i = 0; i < 4; i++) ultima = est.registar(boa(440), 1000 + i * 1000)
    expect(ultima!.tipo).toBe('nota')
    if (ultima!.tipo === 'nota') expect(ultima!.midi).toBe(69)
  })

  it('mesmo assim não usa mais leituras do que o mínimo', () => {
    const est = criarEstabilizador()
    for (let i = 0; i < 3; i++) est.registar(boa(440), 1000 + i * 1000)
    // A quarta leitura, muito diferente, entra numa mediana de três — e
    // como as outras duas ainda são o Lá, não desvia o resultado.
    const s = est.registar(boa(880), 4000)
    expect(s.tipo).toBe('nota')
    if (s.tipo === 'nota') expect(s.midi).toBe(69)
  })
})
