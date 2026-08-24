// O sistema de design da app.
//
// Duas paletas com os MESMOS nomes. É essa a regra que faz o tema
// funcionar: um ecrã escreve `cores.tinta` e nunca sabe qual das duas
// está a ser usada. Se um nome existisse só numa delas, o ecrã teria de
// perguntar em que modo está — e é exatamente isso que se quer evitar.
//
// A paleta clara é a que a app já tinha, valor a valor, e vem do @theme
// de apps/web/src/app/globals.css. A escura vem de handoff/tema.ts, o
// desenho aprovado. Onde o handoff não define um valor, está assinalado
// em baixo.
//
// Nenhum ecrã importa uma paleta diretamente: importam `useTema` ou
// `useEstilos` de tema-contexto.tsx. Não há aqui um export `cores` por
// isso mesmo — enquanto existiu, era possível usar as cores claras sem
// dar por isso, e o compilador não tinha como avisar.

export const claro = {
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

  // A superfície de um cartão ou de um campo. Era `branco` e passou a ter
  // nome de função: no tema escuro um cartão não é branco, e um nome que
  // descreve a cor em vez do papel dela não sobrevive a um segundo tema.
  cartao: '#FFFFFF',
  // O que assenta em cima de uma superfície da cor de acento — o texto de
  // um botão azul, o rótulo de um separador ativo. Também era `branco`, e
  // é o outro trabalho que essa palavra fazia. Separá-los é o que impede
  // cartões brancos no escuro e texto invisível nos botões.
  sobreAcento: '#FFFFFF',

  // Estados
  positivo: '#3D7658',
  aviso: '#8F632F',
  erro: '#9A3B2E',
  dourado: '#A8763A',
  verde: '#7FA98C',

  // Os fundos dos distintivos. Estavam escritos à mão dentro do
  // componentes/base.tsx, em hexadecimal, onde nenhum compilador os podia
  // encontrar — foi preciso ir procurá-los à mão para o tema escuro.
  fundoPositivo: '#E8F1EC',
  fundoAviso: '#FBF1E3',
  fundoErro: '#F7E9E6',
  fundoAzul: '#E7EFF6',

  // Marca, para acentos
  marcaCiano: '#00C4DF',
  marcaVermelho: '#DC291E',
} as const

// A forma da paleta, não os seus valores. Com `typeof claro` cada cor
// ficava com o tipo do literal que está na clara — "#241F1C" e não
// string — e a paleta escura não podia ter outro valor nenhum.
export type Cores = { readonly [K in keyof typeof claro]: string }

export const escuro: Cores = {
  // No escuro o acento deixa de ser o azul e passa a ser o ciano da
  // marca: é a decisão do handoff, e tem razão de ser — o azul-fundo
  // #1B4F7A sobre #100E0D dá 1,6:1, ilegível. O ciano dá 8,4:1.
  azulLogo: '#00C4DF',
  azul: '#00A8C2',
  azulFundo: '#00C4DF',
  azulTexto: '#00C4DF',

  tinta: '#F2EFEA',
  tintaSuave: '#9A938B',
  papel: '#100E0D',
  papel2: '#232120',
  linha: 'rgba(255,255,255,0.08)',
  superficie: '#232120',

  cartao: '#1A1817',
  // Preto-azulado e não branco: o acento passou a ser ciano claro, e
  // texto branco sobre ciano dá 1,9:1. Vem do handoff (botaoTexto).
  sobreAcento: '#0B1214',

  // Estes quatro NÃO estão no handoff, que só define fundo, tinta, ciano
  // e alerta. Foram clareados até passarem 4,5:1 sobre o #100E0D — as
  // versões claras dão todas abaixo de 3:1 e ficavam por ler.
  positivo: '#6FBF8F',
  aviso: '#E0A855',
  erro: '#FF4A3D',
  dourado: '#D9A05B',
  verde: '#8FBF9C',

  // Translúcidos e não opacos, ao contrário dos claros: por cima de um
  // cartão escuro, um fundo opaco tinha de ser calculado para cada
  // superfície onde o distintivo pudesse assentar. É a mesma solução do
  // handoff (cianoFundo, alertaFundo).
  fundoPositivo: 'rgba(111,191,143,0.16)',
  fundoAviso: 'rgba(224,168,85,0.16)',
  fundoErro: 'rgba(255,74,61,0.12)',
  fundoAzul: 'rgba(0,196,223,0.16)',

  marcaCiano: '#00C4DF',
  marcaVermelho: '#FF4A3D',
}

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
//
// Função e não constante: a cor da sombra vem da paleta, e uma sombra
// azul-escura sobre um fundo quase preto não se vê. No escuro é preta,
// que é o que lhe dá alguma profundidade.
export const criarSombra = (cores: Cores) =>
  ({
    shadowColor: cores === claro ? cores.azulFundo : '#000000',
    shadowOpacity: cores === claro ? 0.16 : 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  }) as const
