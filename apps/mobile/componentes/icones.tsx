import Svg, { Circle, Path, Rect } from 'react-native-svg'

// Os sete ícones da barra de navegação, desenhados aqui.
//
// Porquê à mão em vez de uma biblioteca: o `lucide-react-native` exporta
// tudo a partir de um ficheiro único, e o Metro não elimina o que não se
// usa — importar sete ícones trazia os mais de mil e quinhentos, com 2 MB
// atrás. Importar cada um pelo seu subcaminho resolvia o tamanho mas não
// resolvia no servidor de desenvolvimento: a resolução de subcaminhos do
// pacote falha sob as ligações simbólicas do pnpm.
//
// Sete formas simples não justificam uma dependência que dá luta duas
// vezes. O `react-native-svg` já cá estava, e assim o que entra na app é
// exatamente o que se vê.
//
// A linguagem visual é a mesma da web: traço de 24×24, pontas
// arredondadas, espessura a variar entre ativo e inativo.

type Props = {
  color: string
  size?: number
  strokeWidth?: number
}

function Base({
  color,
  size = 22,
  strokeWidth = 1.7,
  children,
}: Props & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  )
}

export function IconeCasa(p: Props) {
  return (
    <Base {...p}>
      <Path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Base>
  )
}

export function IconeCalendario(p: Props) {
  return (
    <Base {...p}>
      <Rect x="3" y="5" width="18" height="16" rx="2" />
      <Path d="M8 3v4M16 3v4M3 10h18" />
    </Base>
  )
}

export function IconeAlunos(p: Props) {
  return (
    <Base {...p}>
      <Circle cx="9" cy="8" r="3.2" />
      <Path d="M3 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
      <Path d="M16.5 5.6a3.2 3.2 0 0 1 0 6" />
      <Path d="M18 14.9c1.9.6 3 2.3 3 4.6" />
    </Base>
  )
}

export function IconeSino(p: Props) {
  return (
    <Base {...p}>
      <Path d="M18 8.8a6 6 0 1 0-12 0c0 5.4-2 6.8-2 6.8h16s-2-1.4-2-6.8" />
      <Path d="M13.7 19a2 2 0 0 1-3.4 0" />
    </Base>
  )
}

export function IconePresencas(p: Props) {
  return (
    <Base {...p}>
      <Path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <Rect x="9" y="2" width="6" height="4" rx="1" />
      <Path d="M9 13.5l2 2 4-4" />
    </Base>
  )
}

export function IconePedidos(p: Props) {
  return (
    <Base {...p}>
      <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7" />
      <Path d="M3 12h5l1.5 2.5h5L16 12h5L18.5 4.6A2 2 0 0 0 16.6 3H7.4a2 2 0 0 0-1.9 1.6z" />
    </Base>
  )
}

export function IconePerfil(p: Props) {
  return (
    <Base {...p}>
      <Circle cx="12" cy="8" r="3.6" />
      <Path d="M4.5 20.5c0-3.6 3.3-5.9 7.5-5.9s7.5 2.3 7.5 5.9" />
    </Base>
  )
}
