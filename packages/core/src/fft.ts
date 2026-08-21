// FFT radix-2 iterativa, escrita à mão e sem dependências.
//
// Existe por uma razão só: a autocorrelação do afinador. Em força bruta,
// correlacionar 4096 amostras até um atraso de ~1400 (o período de 35 Hz
// a 48 kHz) são 5,6 milhões de multiplicações por análise. Vinte vezes
// por segundo, num Android de gama média, isso come o processador todo.
// Pelo teorema de Wiener–Khinchin a mesma conta faz-se com duas FFTs e
// um produto — cerca de cem mil operações.
//
// O pacote @ccg/core não tem DOM nem dependências, por isso não há aqui
// nem AnalyserNode nem biblioteca de terceiros: são arrays e aritmética,
// e correm igual no Node, no browser e no Hermes.

// Inverte os bits do índice. A FFT iterativa começa por reordenar as
// amostras por índice invertido — é o que substitui a recursão do
// algoritmo clássico de dividir-para-conquistar.
function inverterBits(i: number, bits: number): number {
  let r = 0
  for (let b = 0; b < bits; b++) {
    r = (r << 1) | ((i >> b) & 1)
  }
  return r
}

export function ehPotenciaDeDois(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0
}

// Transforma no lugar. `re` e `im` têm o mesmo comprimento, potência de 2.
// `inversa` faz a transformada inversa (com a divisão por n já aplicada).
export function fft(re: Float64Array, im: Float64Array, inversa = false): void {
  const n = re.length
  if (n !== im.length) throw new Error('fft: re e im têm de ter o mesmo comprimento')
  if (!ehPotenciaDeDois(n)) throw new Error('fft: o comprimento tem de ser potência de 2')
  if (n === 1) return

  const bits = Math.log2(n)

  for (let i = 0; i < n; i++) {
    const j = inverterBits(i, bits)
    if (j > i) {
      const tr = re[i]
      re[i] = re[j]
      re[j] = tr
      const ti = im[i]
      im[i] = im[j]
      im[j] = ti
    }
  }

  const sinal = inversa ? 1 : -1
  for (let tamanho = 2; tamanho <= n; tamanho *= 2) {
    const angulo = (sinal * 2 * Math.PI) / tamanho
    const wRe = Math.cos(angulo)
    const wIm = Math.sin(angulo)
    for (let inicio = 0; inicio < n; inicio += tamanho) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < tamanho / 2; k++) {
        const a = inicio + k
        const b = a + tamanho / 2
        const tr = re[b] * curRe - im[b] * curIm
        const ti = re[b] * curIm + im[b] * curRe
        re[b] = re[a] - tr
        im[b] = im[a] - ti
        re[a] += tr
        im[a] += ti
        const proxRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = proxRe
      }
    }
  }

  if (inversa) {
    for (let i = 0; i < n; i++) {
      re[i] /= n
      im[i] /= n
    }
  }
}

// Autocorrelação não normalizada: r(t) = soma de x[j] * x[j+t].
//
// O preenchimento com zeros até ao dobro do comprimento não é detalhe de
// eficiência — sem ele a FFT trata o sinal como circular e o fim do bloco
// contamina o princípio, dando correlações que não existem.
export function autocorrelacao(amostras: Float32Array): Float64Array {
  const n = amostras.length
  let tamanho = 1
  while (tamanho < n * 2) tamanho *= 2

  const re = new Float64Array(tamanho)
  const im = new Float64Array(tamanho)
  for (let i = 0; i < n; i++) re[i] = amostras[i]

  fft(re, im)

  // Densidade espectral de potência: |X(f)|². A parte imaginária anula-se
  // por construção, e é a inversa disto que dá a autocorrelação.
  for (let i = 0; i < tamanho; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i]
    im[i] = 0
  }

  fft(re, im, true)

  return re.slice(0, n)
}
