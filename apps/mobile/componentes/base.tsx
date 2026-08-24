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
import { espaco, raio, texto, type Cores } from '../lib/tema'
import { useEstilos, useTema } from '../lib/tema-contexto'

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
  const estilos = useEstilos(criarEstilos)
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
  const estilos = useEstilos(criarEstilos)
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
  const estilos = useEstilos(criarEstilos)
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
  const estilos = useEstilos(criarEstilos)
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
  const estilos = useEstilos(criarEstilos)
  const tons = useEstilos(criarTons)
  return (
    <View style={[estilos.distintivo, tons[tom].caixa]}>
      <Text style={[estilos.distintivoTexto, tons[tom].letra]}>{conteudo}</Text>
    </View>
  )
}

// Função da paleta como tudo o resto. Era uma constante do módulo com os
// fundos em hexadecimal — a única parte da app onde havia cores fora do
// tema, e por isso a única que o compilador não denunciou.
const criarTons = (
  cores: Cores
): Record<TomDistintivo, { caixa: ViewStyle; letra: { color: string } }> => ({
  neutro: { caixa: { backgroundColor: cores.papel2 }, letra: { color: cores.tintaSuave } },
  positivo: { caixa: { backgroundColor: cores.fundoPositivo }, letra: { color: cores.positivo } },
  aviso: { caixa: { backgroundColor: cores.fundoAviso }, letra: { color: cores.aviso } },
  erro: { caixa: { backgroundColor: cores.fundoErro }, letra: { color: cores.erro } },
  azul: { caixa: { backgroundColor: cores.fundoAzul }, letra: { color: cores.azulTexto } },
})

export function ACarregar() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  return (
    <View style={estilos.centro}>
      <ActivityIndicator color={cores.azulFundo} />
    </View>
  )
}

const criarEstilos = (cores: Cores) => StyleSheet.create({
  cartao: {
    backgroundColor: cores.cartao,
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
