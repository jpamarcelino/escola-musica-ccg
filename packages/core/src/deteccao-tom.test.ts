import { describe, expect, it } from 'vitest'
import { autocorrelacao } from './fft'
import { detetarTom, CLAREZA_MINIMA } from './deteccao-tom'
import { midiDaFrequencia } from './afinacao'

const TAXA = 48000
const N = 4096

function sinusoide(freq: number, n = N, taxa = TAXA, amplitude = 0.3, fase = 0): Float32Array {
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / taxa + fase)
  return x
}

// Somar harmónicos com a fundamental mais fraca do que o 2.º é o caso
// que derruba os detetores ingénuos — é o que faz uma corda grave.
function comHarmonicos(fundamental: number, pesos: number[], n = N): Float32Array {
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let v = 0
    pesos.forEach((peso, k) => {
      v += peso * Math.sin((2 * Math.PI * fundamental * (k + 1) * i) / TAXA)
    })
    x[i] = v
  }
  return x
}

function ruido(n = N, amplitude = 0.3, semente = 12345): Float32Array {
  // Gerador próprio e determinista: com Math.random o teste passava umas
  // vezes e falhava outras, que é pior do que não existir.
  let s = semente
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296
    x[i] = ((s / 4294967296) * 2 - 1) * amplitude
  }
  return x
}

function erroEmCents(detetada: number, esperada: number): number {
  return Math.abs(1200 * Math.log2(detetada / esperada))
}

describe('autocorrelação por FFT', () => {
  it('dá o mesmo que a definição, calculada à bruta', () => {
    const x = sinusoide(220, 256, TAXA)
    const rapida = autocorrelacao(x)
    for (const t of [0, 1, 7, 50, 200]) {
      let bruta = 0
      for (let j = 0; j + t < x.length; j++) bruta += x[j] * x[j + t]
      expect(rapida[t]).toBeCloseTo(bruta, 4)
    }
  })
})

describe('detetarTom com sinais limpos', () => {
  // Da corda mais grave de um baixo de cinco cordas ao topo útil de um
  // violino, passando pelas cordas soltas da guitarra.
  const casos = [41.2, 55, 82.41, 110, 146.83, 196, 246.94, 329.63, 440, 880, 1318.51, 1975.53]

  it.each(casos)('acerta %d Hz com menos de 2 cents de erro', (freq) => {
    const r = detetarTom(sinusoide(freq), TAXA)
    expect(r.frequencia).not.toBeNull()
    expect(erroEmCents(r.frequencia!, freq)).toBeLessThan(2)
  })

  it('não depende da fase do sinal', () => {
    for (const fase of [0, 0.7, 1.9, 3.1]) {
      const r = detetarTom(sinusoide(196, N, TAXA, 0.3, fase), TAXA)
      expect(erroEmCents(r.frequencia!, 196)).toBeLessThan(2)
    }
  })

  it('funciona a 44,1 kHz e não só a 48', () => {
    const x = sinusoide(329.63, 4096, 44100)
    const r = detetarTom(x, 44100)
    expect(erroEmCents(r.frequencia!, 329.63)).toBeLessThan(2)
  })
})

describe('detetarTom perante harmónicos', () => {
  it('não sobe uma oitava quando o 2.º harmónico é mais forte', () => {
    // Mi grave da guitarra, com a fundamental a metade da força do 2.º.
    const x = comHarmonicos(82.41, [0.15, 0.3, 0.2, 0.1])
    const r = detetarTom(x, TAXA)
    expect(r.frequencia).not.toBeNull()
    expect(erroEmCents(r.frequencia!, 82.41)).toBeLessThan(3)
  })

  it('acerta no Mi grave do baixo com a fundamental quase ausente', () => {
    const x = comHarmonicos(41.2, [0.05, 0.25, 0.2, 0.15, 0.1])
    const r = detetarTom(x, TAXA)
    expect(r.frequencia).not.toBeNull()
    expect(Math.round(midiDaFrequencia(r.frequencia!))).toBe(28)
  })

  it('acerta numa forma rica, tipo palheta', () => {
    const x = comHarmonicos(146.83, [0.2, 0.18, 0.14, 0.1, 0.08, 0.05])
    const r = detetarTom(x, TAXA)
    expect(erroEmCents(r.frequencia!, 146.83)).toBeLessThan(3)
  })
})

describe('detetarTom recusa o que não presta', () => {
  it('devolve nulo em silêncio absoluto', () => {
    const r = detetarTom(new Float32Array(N), TAXA)
    expect(r.frequencia).toBeNull()
    expect(r.rms).toBe(0)
  })

  it('devolve nulo com sinal abaixo do limiar de volume', () => {
    const r = detetarTom(sinusoide(440, N, TAXA, 0.0005), TAXA)
    expect(r.frequencia).toBeNull()
  })

  it('recusa ruído branco, mesmo com volume de sobra', () => {
    const r = detetarTom(ruido(), TAXA)
    expect(r.frequencia).toBeNull()
    expect(r.clareza).toBeLessThan(CLAREZA_MINIMA)
  })

  it('recusa uma frequência abaixo da gama', () => {
    const r = detetarTom(sinusoide(20), TAXA)
    expect(r.frequencia).toBeNull()
  })

  it('ainda encontra a nota com ruído por cima, mas moderado', () => {
    const tom = sinusoide(220)
    const sujo = ruido(N, 0.03, 999)
    const x = new Float32Array(N)
    for (let i = 0; i < N; i++) x[i] = tom[i] + sujo[i]
    const r = detetarTom(x, TAXA)
    expect(r.frequencia).not.toBeNull()
    expect(erroEmCents(r.frequencia!, 220)).toBeLessThan(5)
  })
})
