// O sistema de design da app, alinhado com o da web.
//
// Os valores vêm do @theme de apps/web/src/app/globals.css. Foram
// copiados e não importados porque o CSS não atravessa para o React
// Native — o que se pode garantir é que estão os dois no mesmo sítio na
// documentação, e que qualquer alteração se faz nos dois.
//
// A paleta que manda na app é a de tinta sobre papel, com azul para as
// ações. O ciano e o vermelho da marca aparecem pouco, e só como
// acentos — é assim na web e é o que o Manual de Normas pede.

export const cores = {
  // Azuis — a cor das ações e dos títulos
  azulLogo: '#78AEDE',
  azul: '#3D7FB8',
  azulFundo: '#1B4F7A',
  // 5,85:1 sobre papel — a variante que pode levar letras pequenas
  azulTexto: '#33689A',

  // Tinta e papel — o corpo da app
  tinta: '#241F1C',
  tintaSuave: '#6B615A',
  papel: '#FBF8F3',
  papel2: '#F3EDE4',
  linha: '#E4DACC',
  superficie: '#F5F6F8',

  // Estados
  positivo: '#3D7658',
  aviso: '#8F632F',
  erro: '#9A3B2E',
  dourado: '#A8763A',
  verde: '#7FA98C',

  // Marca, para acentos
  marcaCiano: '#00C4DF',
  marcaVermelho: '#DC291E',

  branco: '#FFFFFF',
} as const

// Os títulos da web são em Fraunces, um serifado com bastante carácter; o
// corpo é em Geist. Carregam-se em app/_layout.tsx antes de a app
// aparecer, para não haver um salto de tipo à entrada.
export const tipos = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  corpo: 'Geist_400Regular',
  corpoMedio: 'Geist_500Medium',
  corpoForte: 'Geist_600SemiBold',
} as const

export const espaco = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const

export const raio = {
  pequeno: 12,
  cartao: 18,
  botao: 13,
  grande: 24,
  pilula: 999,
} as const

// A escala de texto. Os tamanhos seguem os da web; o `lineHeight` é
// explícito porque o React Native não tem um valor por omissão razoável
// para texto corrido.
export const texto = {
  titulo: { fontFamily: tipos.displayBold, fontSize: 28, lineHeight: 34 },
  seccao: { fontFamily: tipos.display, fontSize: 20, lineHeight: 26 },
  cartao: { fontFamily: tipos.corpoForte, fontSize: 17, lineHeight: 23 },
  corpo: { fontFamily: tipos.corpo, fontSize: 16, lineHeight: 24 },
  pequeno: { fontFamily: tipos.corpo, fontSize: 14, lineHeight: 20 },
  etiqueta: {
    fontFamily: tipos.corpoForte,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
} as const

// Uma sombra só, a mesma da web (--shadow-flutuante). O iOS e o Android
// exprimem sombras de maneiras diferentes, por isso vão as duas.
export const sombra = {
  shadowColor: cores.azulFundo,
  shadowOpacity: 0.16,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const
