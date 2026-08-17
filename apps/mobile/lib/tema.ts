// As cores da marca, do Manual de Normas do Centro Cultural da Guarda.
// São as mesmas que a web usa em globals.css — aqui em objecto porque o
// React Native não tem CSS.
//
// O ciano da marca (#00C4DF) tem 2,1:1 sobre branco: chega para uma
// superfície ou um traço, não chega para letras. Por isso há uma variante
// escurecida para texto, com 5,46:1, exactamente como na web.
export const cores = {
  ciano: '#00C4DF',
  cianoTexto: '#06707F',
  vermelho: '#DC291E',
  preto: '#231F20',

  fundo: '#FFFFFF',
  superficie: '#F6F7F8',
  contorno: '#E3E6E8',

  texto: '#231F20',
  textoSuave: '#5B6165',

  positivo: '#3D7658',
  aviso: '#8F632F',
} as const

export const espaco = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const

export const raio = {
  cartao: 16,
  botao: 999,
} as const
