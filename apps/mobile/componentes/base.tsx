import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { cores, espaco, raio, texto } from '../lib/tema'

// As peças que se repetem em todos os ecrãs, num sítio só. São as mesmas
// que a web tem em src/components — Cartao, PageHeader, EmptyState,
// Distintivo — com os mesmos nomes, para quem conhece um lado reconhecer
// o outro.

export function Cartao({
  children,
  style,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return <View style={[estilos.cartao, style]}>{children}</View>
}

// Cartão em que se toca. Existe à parte do Cartao porque tem de dizer
// que é tocável — a seta e o papel de botão não são decoração, são a
// única pista que um leitor de ecrã tem.
export function CartaoTocavel({
  children,
  onPress,
  rotulo,
  style,
}: {
  children: ReactNode
  onPress?: () => void
  rotulo?: string
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      // Estilo em objeto e não em função: dentro de um `Link asChild` o
      // expo-router clona o elemento e um style que seja função nunca
      // chega a ser chamado — o cartão fica sem fundo nenhum.
      style={[estilos.cartao, estilos.cartaoTocavel, style]}
    >
      <View style={{ flex: 1 }}>{children}</View>
      <Text style={estilos.seta}>›</Text>
    </Pressable>
  )
}

export function Cabecalho({
  titulo,
  sobretitulo,
  descricao,
}: {
  titulo: string
  sobretitulo?: string
  descricao?: string
}) {
  return (
    <View style={estilos.cabecalho}>
      {sobretitulo ? <Text style={estilos.sobretitulo}>{sobretitulo}</Text> : null}
      <Text style={estilos.titulo} accessibilityRole="header">
        {titulo}
      </Text>
      {descricao ? <Text style={estilos.descricao}>{descricao}</Text> : null}
    </View>
  )
}

export function EstadoVazio({
  titulo,
  descricao,
}: {
  titulo: string
  descricao?: string
}) {
  return (
    <View style={estilos.vazio}>
      <Text style={estilos.vazioTitulo}>{titulo}</Text>
      {descricao ? <Text style={estilos.vazioTexto}>{descricao}</Text> : null}
    </View>
  )
}

export type TomDistintivo = 'neutro' | 'positivo' | 'aviso' | 'erro' | 'azul'

// A cor sozinha não distingue nada para quem não a vê. O distintivo leva
// sempre texto, e é o texto que carrega o significado — a cor só reforça.
export function Distintivo({ texto: conteudo, tom = 'neutro' }: { texto: string; tom?: TomDistintivo }) {
  return (
    <View style={[estilos.distintivo, TONS[tom].caixa]}>
      <Text style={[estilos.distintivoTexto, TONS[tom].letra]}>{conteudo}</Text>
    </View>
  )
}

const TONS: Record<TomDistintivo, { caixa: ViewStyle; letra: { color: string } }> = {
  neutro: { caixa: { backgroundColor: cores.papel2 }, letra: { color: cores.tintaSuave } },
  positivo: { caixa: { backgroundColor: '#E8F1EC' }, letra: { color: cores.positivo } },
  aviso: { caixa: { backgroundColor: '#FBF1E3' }, letra: { color: cores.aviso } },
  erro: { caixa: { backgroundColor: '#F7E9E6' }, letra: { color: cores.erro } },
  azul: { caixa: { backgroundColor: '#E7EFF6' }, letra: { color: cores.azulTexto } },
}

export function ACarregar() {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator color={cores.azulFundo} />
    </View>
  )
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.branco,
    borderWidth: 1,
    // O fundo branco sobre papel tem pouco contraste — é o contorno que
    // faz o cartão existir, tal como na web.
    borderColor: cores.linha,
    borderRadius: raio.cartao,
    padding: espaco.m,
    gap: espaco.xs,
  },
  cartaoTocavel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.s,
    // 44 pontos é o alvo de toque mínimo; 60 passa disso com folga.
    minHeight: 60,
  },
  seta: { fontSize: 26, color: cores.tintaSuave, marginTop: -3 },

  cabecalho: { gap: espaco.xs, marginBottom: espaco.m },
  sobretitulo: { ...texto.etiqueta, color: cores.azulTexto },
  titulo: { ...texto.titulo, color: cores.tinta },
  descricao: { ...texto.pequeno, color: cores.tintaSuave },

  vazio: { paddingVertical: espaco.xl, paddingHorizontal: espaco.s, gap: espaco.s },
  vazioTitulo: { ...texto.seccao, color: cores.tinta },
  vazioTexto: { ...texto.corpo, color: cores.tintaSuave },

  distintivo: {
    alignSelf: 'flex-start',
    borderRadius: raio.pilula,
    paddingVertical: 4,
    paddingHorizontal: espaco.s + 2,
  },
  distintivoTexto: { ...texto.etiqueta },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.papel },
})
