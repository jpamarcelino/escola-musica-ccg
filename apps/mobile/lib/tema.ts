// O sistema de design da app.
//
// Duas paletas com os MESMOS nomes. É essa a regra que faz o tema
// funcionar: um ecrã escreve `cores.tinta` e nunca sabe qual das duas
// está a ser usada.
//
// Os valores vêm de handoff/tema.ts — o desenho aprovado. A paleta tem
// duas famílias de nomes de propósito:
//
//   * os do handoff (fundo, cartao, ciano, botao…), que os ecrãs novos
//     usam;
//   * os antigos (papel, azulFundo, erro…), que os ecrãs ainda por
//     redesenhar continuam a usar.
//
// Os segundos não são derivados dos primeiros por magia: estão escritos
// aqui, um a um, apontados ao valor certo. Enquanto os quatro ecrãs do
// redesenho não forem os únicos que existem, apagar a família antiga era
// partir vinte e quatro ecrãs para arrumar um ficheiro.

export const claro = {
  // ── Handoff ──────────────────────────────────────────────────────
  fundo: '#FAFAF8',
  cartao: '#FFFFFF',
  cartaoSuave: '#F1F0EC',
  linha: '#E6E4DF',
  linhaForte: 'rgba(23,21,15,0.14)',
  tinta: '#17150F',
  tintaMedia: '#3C382F',
  tintaSuave: '#6F6A63',
  // #007D91 e não #00C4DF: o ciano da marca sobre branco dá 2,1:1 em
  // texto, que não se lê.
  ciano: '#007D91',
  cianoForte: '#00A8C2',
  cianoFundo: 'rgba(0,196,223,0.16)',
  alerta: '#DC291E',
  alertaFundo: 'rgba(220,41,30,0.07)',
  alertaLinha: 'rgba(220,41,30,0.4)',
  botao: '#17150F',
  botaoTexto: '#FAFAF8',

  // ── Nomes antigos, para os ecrãs ainda por redesenhar ────────────
  papel: '#FAFAF8',
  papel2: '#F1F0EC',
  superficie: '#F1F0EC',
  // O acento dos ecrãs antigos era azul. Passa a ser o ciano escuro, que
  // é o que o handoff usa para o mesmo trabalho e que se lê sobre branco.
  azulFundo: '#007D91',
  azulTexto: '#007D91',
  azul: '#00A8C2',
  azulLogo: '#00A8C2',
  // O que assenta sobre uma superfície da cor de acento. Era `branco`, e
  // essa palavra fazia dois trabalhos — este e o de superfície de cartão.
  sobreAcento: '#FFFFFF',
  erro: '#DC291E',
  marcaVermelho: '#DC291E',
  marcaCiano: '#00C4DF',
  // Estes quatro não existem no handoff. Ficam como estavam.
  positivo: '#3D7658',
  aviso: '#8F632F',
  dourado: '#A8763A',
  verde: '#7FA98C',
  fundoPositivo: '#E8F1EC',
  fundoAviso: '#FBF1E3',
  fundoErro: 'rgba(220,41,30,0.07)',
  fundoAzul: 'rgba(0,196,223,0.16)',
} as const

// A forma da paleta, não os seus valores. Com `typeof claro` cada cor
// ficava com o tipo do literal que está na clara — "#17150F" e não
// string — e a paleta escura não podia ter outro valor nenhum.
export type Cores = { readonly [K in keyof typeof claro]: string }

export const escuro: Cores = {
  fundo: '#100E0D',
  cartao: '#1A1817',
  cartaoSuave: '#232120',
  linha: 'rgba(255,255,255,0.08)',
  linhaForte: 'rgba(255,255,255,0.22)',
  tinta: '#F2EFEA',
  tintaMedia: '#C9C2B9',
  tintaSuave: '#9A938B',
  // Em fundo escuro o ciano da marca pode brilhar: 8,4:1.
  ciano: '#00C4DF',
  cianoForte: '#00C4DF',
  cianoFundo: 'rgba(0,196,223,0.16)',
  alerta: '#FF4A3D',
  alertaFundo: 'rgba(255,74,61,0.12)',
  alertaLinha: 'rgba(255,74,61,0.4)',
  botao: '#00C4DF',
  botaoTexto: '#0B1214',

  papel: '#100E0D',
  papel2: '#232120',
  superficie: '#232120',
  azulFundo: '#00C4DF',
  azulTexto: '#00C4DF',
  azul: '#00C4DF',
  azulLogo: '#00C4DF',
  // Preto-azulado e não branco: o acento é ciano claro, e texto branco
  // sobre ciano dá 1,9:1.
  sobreAcento: '#0B1214',
  erro: '#FF4A3D',
  marcaVermelho: '#FF4A3D',
  marcaCiano: '#00C4DF',
  // Clareados até passarem 4,5:1 sobre o #100E0D. Não estão no handoff.
  positivo: '#6FBF8F',
  aviso: '#E0A855',
  dourado: '#D9A05B',
  verde: '#8FBF9C',
  fundoPositivo: 'rgba(111,191,143,0.16)',
  fundoAviso: 'rgba(224,168,85,0.16)',
  fundoErro: 'rgba(255,74,61,0.12)',
  fundoAzul: 'rgba(0,196,223,0.16)',
}

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

// Manrope para tudo, IBM Plex Mono só para horas, datas e números.
// Nunca mono em texto corrido, nunca etiquetas em caixa alta.
export const tipos = {
  corpo: 'Manrope_400Regular',
  corpoMedio: 'Manrope_600SemiBold',
  corpoForte: 'Manrope_600SemiBold',
  display: 'Manrope_800ExtraBold',
  mono: 'IBMPlexMono_500Medium',
  monoForte: 'IBMPlexMono_600SemiBold',
} as const

export const espaco = { xs: 6, s: 8, m: 20, l: 24, xl: 32, xxl: 48 } as const

// `mosaico` e `capsula` vêm do handoff; `pequeno`, `grande` e `pilula`
// são dos ecrãs antigos e ficam até eles saírem.
export const raio = {
  cartao: 18,
  botao: 16,
  mosaico: 14,
  capsula: 999,
  pequeno: 12,
  grande: 24,
  pilula: 999,
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
  // Sem caixa alta: é regra do handoff. Fica porque os ecrãs antigos a
  // usam — deixou é de gritar.
  etiqueta: { fontFamily: tipos.corpoMedio, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
} as const

// Função e não constante: a cor da sombra vem da paleta, e uma sombra
// azul-escura sobre um fundo quase preto não se vê.
export const criarSombra = (cores: Cores) =>
  ({
    shadowColor: cores === claro ? cores.tinta : '#000000',
    shadowOpacity: cores === claro ? 0.16 : 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  }) as const
