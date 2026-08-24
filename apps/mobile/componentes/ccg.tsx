// Os componentes novos do redesenho.
//
// Vêm de handoff/ccg.tsx com três correções: o useTema() deste projeto
// devolve um objeto com a paleta lá dentro (e não a paleta em si), a
// barra passou a ter tipos a sério em vez de `any`, e o caminho do
// símbolo veio do public/simbolo-ccg.svg.
import type { ReactNode } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { G, Path } from 'react-native-svg'
import { barra, raio, texto } from '../lib/tema'
import { useTema } from '../lib/tema-contexto'

// ── Pincelada ─────────────────────────────────────────────────────────
// Inline em SVG e não <Image>: é o que permite pintá-la (o manual prevê
// o símbolo em ciano, preto e branco conforme o fundo) e não depende da
// rede para desenhar a barra.
export function Pincelada({ tamanho = 24, cor = barra.marcaSimbolo }) {
  return (
    <Svg width={tamanho} height={tamanho * 1.08} viewBox="0 0 131.213 141.725">
      <G transform="translate(-341.9028,-165.6967)">
        <Path fill={cor} transform="matrix(1,0,0,-1,395.3508,295.49574)" d={CAMINHO_SIMBOLO} />
      </G>
    </Svg>
  )
}

// ── Cabeçalho da home pública ─────────────────────────────────────────
// Pincelada e nome na MESMA linha. Nunca o nome debaixo do símbolo.
export function MarcaLinha({ cor }: { cor?: string }) {
  const { cores: c } = useTema()
  return (
    <View style={estilos.marcaLinha}>
      <Pincelada tamanho={26} cor="#00C4DF" />
      {/* A cor entra por fora porque esta linha tanto assenta no fundo da
          app como por cima de uma fotografia. Sobre o mármore, o cinzento
          do tema não se lê. */}
      <Text style={[texto.pequeno, { fontSize: 13.5, color: cor ?? c.tintaSuave }]}>
        Centro Cultural da Guarda
      </Text>
    </View>
  )
}

// Só a parte do tabBar que esta barra usa. O tipo verdadeiro vive no
// @react-navigation/bottom-tabs, que é dependência do expo-router e não
// desta app — importá-lo obrigava a declará-lo aqui como dependência
// direta para ganhar um tipo que se descreve em oito linhas.
type PropsDaBarra = {
  state: { index: number; routes: { key: string; name: string }[] }
  descriptors: Record<
    string,
    {
      options: {
        title?: string
        href?: string | null
        tabBarIcon?: (p: { color: string; focused: boolean; size: number }) => ReactNode
      }
    }
  >
  navigation: { navigate: (nome: string) => void }
}

// ── Cápsula de navegação ──────────────────────────────────────────────
// Substitui o tabBar por defeito: cápsula escura flutuante, ícones e
// rótulos claros, risco ciano no ativo e a pincelada num disco da cor
// da barra, meio dentro meio fora.
export function BarraCapsula({ state, descriptors, navigation }: PropsDaBarra) {
  return (
    <View style={estilos.barraFora}>
      <View style={estilos.capsula}>
        <View style={estilos.marcaDisco}>
          <Pincelada tamanho={22} />
        </View>
        {state.routes.map((rota, i) => {
          const { options } = descriptors[rota.key]
          if (options.href === null) return null
          const ativo = state.index === i
          const cor = ativo ? barra.iconeAtivo : barra.iconeInativo
          return (
            <Pressable
              key={rota.key}
              onPress={() => navigation.navigate(rota.name)}
              style={estilos.separador}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
            >
              {options.tabBarIcon?.({ color: cor, focused: ativo, size: 22 })}
              <Text style={[estilos.rotulo, { color: cor }]} numberOfLines={1}>
                {options.title}
              </Text>
              {ativo && <View style={estilos.riscoAtivo} />}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// ── Painel de ação encostado ao fundo ─────────────────────────────────
// O gradiente é obrigatório: sem ele o painel corta o conteúdo a meio,
// como se a lista acabasse ali.
export function PainelAcao({ children }: { children: ReactNode }) {
  const { cores: c } = useTema()
  return (
    <LinearGradient colors={['transparent', c.fundo, c.fundo]} locations={[0, 0.26, 1]} style={estilos.painel}>
      {children}
    </LinearGradient>
  )
}

export function BotaoPrincipal({ rotulo, onPress }: { rotulo: string; onPress?: () => void }) {
  const { cores: c } = useTema()
  return (
    <Pressable onPress={onPress} style={[estilos.botao, { backgroundColor: c.botao }]}>
      <Text style={[texto.cartao, { fontSize: 15.5, color: c.botaoTexto }]}>{rotulo}</Text>
    </Pressable>
  )
}

// ── Cartão de professor (home pública) ────────────────────────────────
// Foto real quando existe, iniciais quando não — nunca as duas coisas
// misturadas na mesma lista sem razão.
export function FichaProfessor({
  nome,
  area,
  iniciais,
  foto,
  onPress,
}: {
  nome: string
  area: string
  iniciais: string
  foto?: string | null
  onPress?: () => void
}) {
  const { cores: c } = useTema()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nome}, ${area}`}
      style={[estilos.ficha, { backgroundColor: c.cartao, borderColor: c.linha }]}
    >
      {foto ? (
        <Image source={{ uri: foto }} style={estilos.retrato} />
      ) : (
        <View style={[estilos.retrato, estilos.retratoIniciais, { backgroundColor: c.cianoFundo }]}>
          <Text style={[texto.cartao, { color: c.ciano }]}>{iniciais}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[texto.cartao, { color: c.tinta }]}>{nome}</Text>
        <Text style={[texto.pequeno, { color: c.tintaSuave }]}>{area}</Text>
      </View>
      <Text style={{ fontSize: 20, color: c.tintaSuave }}>›</Text>
    </Pressable>
  )
}

// Três de cada vez, sorteados sem repetir: quem volta à página vê caras
// diferentes. Sortear no servidor não: a lista é curta e cabe em memória.
export function sortearTres<T>(todos: T[]): T[] {
  const b = todos.slice()
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b.slice(0, 3)
}

const estilos = StyleSheet.create({
  marcaLinha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barraFora: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  capsula: {
    flexDirection: 'row',
    gap: 2,
    padding: 8,
    borderRadius: raio.capsula,
    backgroundColor: barra.fundo,
    // Sem backdrop-filter em RN: a cápsula é opaca, de propósito.
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  marcaDisco: {
    position: 'absolute',
    top: -15,
    left: '50%',
    marginLeft: -17,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: barra.marcaDisco,
    zIndex: 1,
  },
  separador: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 4 },
  rotulo: { fontFamily: 'Manrope_600SemiBold', fontSize: 10 },
  riscoAtivo: { position: 'absolute', bottom: 2, left: '18%', right: '18%', height: 2, borderRadius: 999, backgroundColor: '#00C4DF' },
  painel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22 },
  botao: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: raio.botao },
  ficha: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: raio.cartao, borderWidth: 1 },
  retrato: { width: 52, height: 52, borderRadius: 26 },
  retratoIniciais: { alignItems: 'center', justifyContent: 'center' },
})

// Path extraído de public/simbolo-ccg.svg (arte original do Manual de
// Normas Gráficas, não redesenhada).
const CAMINHO_SIMBOLO =
  'M0 0C17.012-2.787 36.006 2.792 47.055 10.791 63.261 23.751 62.329 44.072 63.772 59.69L64.906 55.077 66.591 56.037C67.973 71.506 64.602 86.635 53.693 101.501 48.042 105.729 44.938 112.362 37.418 115.179L35.985 114.819C37.815 94.806 57.191 74.493 47.329 54.083 43.033 48.131 32.474 43.121 21.852 42.83 6.681 43.296-4.983 49.061-13.892 55.894-9.407 54.988-5.424 50.45 .069 49.502-6.824 53.818-13.531 58.581-18.188 64.555-19.259 64.446-19.511 63.848-18.63 63.506L-17.48 61.977C-19.228 63.302-20.093 64.291-20.706 65.875L-19.323 66.731C-33.535 82.266-33.177 102-22.511 118.841-19.287 122.248-13.889 124.73-8.145 126.815L-8.491 127.211-16.376 124.908C-14.3 127.41-9.248 127.851-5.613 128.578 3.611 129.799 13.983 127.055 22.999 124.748 25.444 125.683 41.422 119.415 41.384 119.314 41.375 119.29 40.368 119.649 37.903 120.6 36.913 118.853 41.429 116.804 43.712 115.532 52.858 108.651 59.467 100.01 62.963 92.485 66.11 92.662 63.122 89.207 66.725 88.641 67.182 85.465 69.465 81.757 72.079 79.442 74.643 72.755 74.3 65.844 74.726 58.939L76.599 57.911C77.765 49.72 72.478 46.893 72.872 38.695 75.515 37.443 72.812 35.37 72.812 33.54 73.022 33.322 73.065 33.061 72.97 32.831 72.856 33.06 72.812 33.298 72.812 33.54L70.765 32.464C72.575 31.287 72.165 31.532 72.245 29.892L71.616 28.397 71.332 28.939C69.9 28.579 70.231 27.539 69.679 26.838L70.609 26 71.206 26.206C69.541 11.282 54.374-2.864 30.124-7.545 15.613-9.16 .365-11.926-14.082-6.086-29.948 .041-42.728 8.628-53.448 19.074-46.883 13.364-38.511 6.479-29.256 1.688L-28.659 1.891-33.256 5.579C-32.136 5.191-31.159 3.857-30.265 4.164-30.253 4.58-30.338 4.899-30.497 5.147L-31.546 5.837C-33.251 6.334-36.116 5.769-36.636 7.886-36.229 7.64-35.632 7.845-35.332 7.947-35.851 8.54-36.795 8.729-37.252 9.472L-39.155 9.207C-41.69 12.316-39.708 10.942-43.659 14.336L-46.365 15.208-45.392 16.31C-40.693 12.57-36.327 9.031-31.546 5.837-31.094 5.705-30.722 5.498-30.497 5.147-26.393 2.485-21.949 .079-16.712-1.983-17.782-4.526-9.834-4.508-6.845-5.924L-6.011-5.768C-36.103 5.504-31.208 9.225 0 0M-4.25 119.27C-9.798 116.983-19.458 113.172-21.51 107.886-30.816 88.309-13.973 67.671 10.376 55.255 16.909 53.443 26.642 49.461 31.779 55.137 44.099 63.677 33.771 75.36 32.031 84.48 35.168 84.068 34.17 81.024 35.858 80.802L21.981 107.401C22.381 110.047 19.534 112.646 18.578 114.835L18.331 109.786C17.807 112.713 14.59 115.837 16.478 118.447 8.907 120.078 1.702 121.186-4.859 119.828Z'
