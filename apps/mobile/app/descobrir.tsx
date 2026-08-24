import {
  listarProfessoresDoCartaz,
  numerosPublicos,
  type NumerosPublicos,
  type ProfessorDoCartaz,
} from '@ccg/data'
import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BotaoPrincipal, FichaProfessor, MarcaLinha, PainelAcao, sortearTres } from '../componentes/ccg'
import { supabase } from '../lib/supabase'
import { espaco, raio, texto, tipos, type Cores } from '../lib/tema'
import { useEstilos, useTema } from '../lib/tema-contexto'

// A home de quem ainda não tem conta.
//
// A ordem não é decorativa: primeiro o que a escola é (imagem e frase),
// depois o tamanho dela (os números), depois o que lá se faz (as três
// escolas), depois quem lá está (os professores) e só no fim o que se
// pede à pessoa. Quem chega aqui está a decidir se vale a pena, não a
// executar uma tarefa — pôr o botão em primeiro era responder antes da
// pergunta.

const ESCOLAS = [
  { programa: 'musica' as const, nome: 'Música' },
  { programa: 'danca' as const, nome: 'Dança' },
  { programa: 'bebes' as const, nome: 'Primeiros sons' },
]

// De quantos em quantos segundos as fichas rodam. Seis é tempo de ler
// três nomes sem correr, e curto ao ponto de se perceber que a lista é
// maior do que aquilo que está no ecrã.
const ROTACAO_MS = 6000

function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export default function Descobrir() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [numeros, setNumeros] = useState<NumerosPublicos | null>(null)
  const [todos, setTodos] = useState<ProfessorDoCartaz[]>([])
  const [tres, setTres] = useState<ProfessorDoCartaz[]>([])
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let ativo = true
    // Sem sessão. As duas funções são `security definer` e decidem lá
    // dentro o que pode ser mostrado a quem passa — ver a migração 0055.
    void Promise.all([numerosPublicos(supabase), listarProfessoresDoCartaz(supabase)]).then(
      ([n, profs]) => {
        if (!ativo) return
        setNumeros(n)
        setTodos(profs)
        setTres(sortearTres(profs))
      }
    )
    return () => {
      ativo = false
    }
  }, [])

  // Rodar só quando há mais do que três: com três ou menos, a "rotação"
  // trocava as caras de sítio de seis em seis segundos sem mostrar
  // ninguém novo, o que lê como avaria e não como novidade.
  useEffect(() => {
    if (todos.length <= 3) return
    relogio.current = setInterval(() => setTres(sortearTres(todos)), ROTACAO_MS)
    return () => {
      if (relogio.current) clearInterval(relogio.current)
      relogio.current = null
    }
  }, [todos])

  const irParaEscola = useCallback(
    (programa: string) => router.push(`/pedir-aula?programa=${programa}`),
    [router]
  )

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[estilos.conteudo, { paddingBottom: 190 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* O herói: mármore, gradiente e o título por cima. O gradiente
            não é enfeite — sem ele o texto branco assenta em zonas
            claras da pedra e deixa de se ler. */}
        <View style={estilos.heroi}>
          <Image
            source={require('../assets/marmore-fundo.jpg')}
            style={estilos.marmore}
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            // Três paragens e não duas: o mármore é claro no topo, e um
            // gradiente que só escurece o fundo deixava a marca e o
            // "Entrar" a flutuar sobre pedra branca.
            colors={['rgba(16,14,13,0.55)', 'rgba(16,14,13,0.30)', 'rgba(16,14,13,0.88)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[estilos.heroiConteudo, { paddingTop: insets.top + espaco.m }]}>
            <View style={estilos.heroiTopo}>
              <MarcaLinha cor="#FFFFFF" />
              <Pressable
                onPress={() => router.push('/entrar')}
                accessibilityRole="button"
                style={estilos.entrar}
              >
                <Text style={estilos.entrarTexto}>Entrar</Text>
              </Pressable>
            </View>
            <Text style={estilos.titulo}>Três escolas artísticas, uma inscrição.</Text>
          </View>
        </View>

        {/* Os números da escola. Reais, vindos da base — ver 0055. */}
        <View style={estilos.numeros}>
          <Numero valor={numeros?.alunos} rotulo="alunos" />
          <View style={estilos.divisor} />
          <Numero valor={numeros?.professores} rotulo="professores" />
          <View style={estilos.divisor} />
          <Numero valor={numeros?.escolas} rotulo="escolas" />
        </View>

        <View style={estilos.chips}>
          {ESCOLAS.map((e) => (
            <Pressable
              key={e.programa}
              onPress={() => irParaEscola(e.programa)}
              accessibilityRole="button"
              style={estilos.chip}
            >
              <Text style={estilos.chipTexto}>{e.nome}</Text>
            </Pressable>
          ))}
        </View>

        <View style={estilos.fichas}>
          {tres.map((p) => (
            <FichaProfessor
              key={p.professor_id}
              nome={p.nome}
              area={p.areas}
              iniciais={iniciaisDe(p.nome)}
              foto={p.foto_url}
              onPress={() => router.push('/pedir-aula')}
            />
          ))}
        </View>

        {todos.length > 3 ? (
          <Pressable
            onPress={() => router.push('/pedir-aula')}
            accessibilityRole="button"
            style={estilos.verTodos}
          >
            <Text style={estilos.verTodosTexto}>
              Conhece os {todos.length} professores →
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Um botão só. Havia dois — "Criar conta" e "Já tenho conta" — e
          o segundo está agora no canto do herói: quem já tem conta não
          precisa de o ver ao fundo de uma página que existe para
          convencer quem não tem. */}
      <PainelAcao>
        <BotaoPrincipal rotulo="Pedir uma aula" onPress={() => router.push('/pedir-aula')} />
      </PainelAcao>
    </>
  )

  function Numero({ valor, rotulo }: { valor: number | undefined; rotulo: string }) {
    return (
      <View style={estilos.numero}>
        {/* Um traço enquanto não chega, e não um zero: zero alunos é uma
            afirmação, e falsa. */}
        <Text style={[estilos.numeroValor, { color: cores.ciano }]}>{valor ?? '—'}</Text>
        <Text style={estilos.numeroRotulo}>{rotulo}</Text>
      </View>
    )
  }
}

const criarEstilos = (cores: Cores) =>
  StyleSheet.create({
    conteudo: { backgroundColor: cores.fundo },
    heroi: { height: 340, justifyContent: 'flex-end' },
    marmore: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    heroiConteudo: { flex: 1, justifyContent: 'space-between', padding: espaco.m },
    heroiTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    entrar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espaco.s },
    entrarTexto: { ...texto.cartao, color: '#FFFFFF' },
    titulo: { ...texto.titulo, color: '#FFFFFF', marginBottom: espaco.s },

    numeros: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: espaco.m,
      paddingHorizontal: espaco.m,
      borderBottomWidth: 1,
      borderBottomColor: cores.linha,
    },
    numero: { flex: 1, gap: 2 },
    numeroValor: { ...texto.numero },
    numeroRotulo: { ...texto.pequeno, color: cores.tintaSuave },
    divisor: { width: 1, height: 34, backgroundColor: cores.linha },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s, padding: espaco.m },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: espaco.m,
      borderRadius: raio.capsula,
      borderWidth: 1,
      borderColor: cores.linha,
      backgroundColor: cores.cartao,
    },
    chipTexto: { ...texto.cartao, color: cores.tinta },

    fichas: { gap: espaco.s, paddingHorizontal: espaco.m },
    verTodos: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espaco.m },
    verTodosTexto: { ...texto.cartao, fontFamily: tipos.corpoMedio, color: cores.ciano },
  })
