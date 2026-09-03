// apps/mobile/lib/tema.ts — substitui o ficheiro atual.
// Dois temas: o claro é o que a app já tem, reafinado; o escuro é novo.
// Regra: cores nunca são escolhidas no ecrã, só aqui.

export const claro = {
  fundo: '#FAFAF8',
  cartao: '#FFFFFF',
  cartaoSuave: '#F1F0EC',
  linha: '#E6E4DF',
  linhaForte: 'rgba(23,21,15,0.14)',
  tinta: '#17150F',
  tintaMedia: '#3C382F',
  tintaSuave: '#6F6A63',
  // #007D91 e não #00C4DF: o ciano da marca sobre branco dá 2.1:1 em texto.
  ciano: '#007D91',
  cianoForte: '#00A8C2',
  cianoFundo: 'rgba(0,196,223,0.16)',
  alerta: '#DC291E',
  alertaFundo: 'rgba(220,41,30,0.07)',
  alertaLinha: 'rgba(220,41,30,0.4)',
  botao: '#17150F',
  botaoTexto: '#FAFAF8',
} as const

export const escuro = {
  fundo: '#100E0D',
  cartao: '#1A1817',
  cartaoSuave: '#232120',
  linha: 'rgba(255,255,255,0.08)',
  linhaForte: 'rgba(255,255,255,0.22)',
  tinta: '#F2EFEA',
  tintaMedia: '#C9C2B9',
  tintaSuave: '#9A938B',
  // Em fundo escuro o ciano da marca pode brilhar: 8.4:1.
  ciano: '#00C4DF',
  cianoForte: '#00C4DF',
  cianoFundo: 'rgba(0,196,223,0.16)',
  alerta: '#FF4A3D',
  alertaFundo: 'rgba(255,74,61,0.12)',
  alertaLinha: 'rgba(255,74,61,0.4)',
  botao: '#00C4DF',
  botaoTexto: '#0B1214',
} as const

// A cápsula de navegação é escura nos DOIS temas — é o que dá
// continuidade entre eles e o que faz o disco da pincelada ler como
// saliência da barra e não como bola colada.
export const barra = {
  fundo: '#241F1C',
  iconeAtivo: '#FFFFFF',
  iconeInativo: 'rgba(255,255,255,0.68)',
  marcaDisco: '#241F1C',
  marcaSimbolo: '#00C4DF',
} as const

export type Cores = typeof claro

export const espaco = { xs: 6, s: 8, m: 20, l: 24, xl: 32, xxl: 48 } as const
export const raio = { cartao: 18, botao: 16, mosaico: 14, capsula: 999 } as const

// Manrope para tudo, IBM Plex Mono só para horas, datas e números.
// Nunca mono em texto corrido, nunca etiquetas em caixa alta.
export const tipos = {
  corpo: 'Manrope_400Regular',
  corpoMedio: 'Manrope_600SemiBold',
  display: 'Manrope_800ExtraBold',
  mono: 'IBMPlexMono_500Medium',
  monoForte: 'IBMPlexMono_600SemiBold',
} as const

export const texto = {
  titulo: { fontFamily: tipos.display, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  seccao: { fontFamily: tipos.corpoMedio, fontSize: 13 },
  cartao: { fontFamily: tipos.corpoMedio, fontSize: 15.5, lineHeight: 21 },
  corpo: { fontFamily: tipos.corpo, fontSize: 14.5, lineHeight: 22 },
  pequeno: { fontFamily: tipos.corpo, fontSize: 12.5, lineHeight: 18 },
  hora: { fontFamily: tipos.monoForte, fontSize: 34, letterSpacing: -1 },
  horaLista: { fontFamily: tipos.monoForte, fontSize: 14 },
  numero: { fontFamily: tipos.monoForte, fontSize: 32, lineHeight: 38 },
} as const
