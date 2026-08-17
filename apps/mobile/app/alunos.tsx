import { listarAlunosDoEncarregado, type AlunoResumo } from '@ccg/data'
import { Link, Redirect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSessao } from '../lib/sessao'
import { supabase } from '../lib/supabase'
import { cores, espaco, raio } from '../lib/tema'

export default function Alunos() {
  const { sessao, aCarregar: sessaoACarregar } = useSessao()
  const router = useRouter()
  const [alunos, setAlunos] = useState<AlunoResumo[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [aRecarregar, setARecarregar] = useState(false)

  const carregar = useCallback(async () => {
    if (!sessao) return
    // A query é a mesma do site — vem do @ccg/data. O que muda é só de
    // onde vem a sessão: aqui do armazenamento do telemóvel, na web dos
    // cookies. Quem decide o que aparece continuam a ser as políticas de
    // RLS, iguais nas duas.
    const lista = await listarAlunosDoEncarregado(supabase, sessao.user.id)
    setAlunos(lista)
  }, [sessao])

  useEffect(() => {
    if (sessaoACarregar || !sessao) return

    // `ativo` evita escrever estado num ecrã que já saiu — acontece se a
    // pessoa voltar atrás enquanto a lista ainda está a chegar.
    let ativo = true

    // O `setACarregar` fica depois do `await`, e não encadeado num
    // `.finally()` a seguir à chamada: assim não corre em síncrono dentro
    // do efeito, que é o que provoca renderizações em cascata.
    const buscar = async () => {
      await carregar()
      if (ativo) setACarregar(false)
    }

    void buscar()

    return () => {
      ativo = false
    }
  }, [carregar, sessao, sessaoACarregar])

  if (sessaoACarregar) return <Centro><ActivityIndicator color={cores.cianoTexto} /></Centro>
  if (!sessao) return <Redirect href="/entrar" />

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/entrar')
  }

  if (aCarregar) {
    return <Centro><ActivityIndicator color={cores.cianoTexto} /></Centro>
  }

  return (
    <FlatList
      data={alunos}
      keyExtractor={(a) => a.id}
      contentContainerStyle={estilos.lista}
      refreshControl={
        <RefreshControl
          refreshing={aRecarregar}
          onRefresh={() => {
            setARecarregar(true)
            carregar().finally(() => setARecarregar(false))
          }}
          tintColor={cores.cianoTexto}
        />
      }
      ListHeaderComponent={
        <Link href="/notificacoes" asChild>
          <Pressable accessibilityRole="button" style={estilos.avisos}>
            <Text style={estilos.avisosTexto}>Ver avisos</Text>
          </Pressable>
        </Link>
      }
      ListEmptyComponent={
        <View style={estilos.vazio}>
          <Text style={estilos.vazioTitulo}>Ainda não há alunos.</Text>
          <Text style={estilos.vazioTexto}>
            Os alunos a teu cargo aparecem aqui assim que forem criados no site.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Link href={`/aluno/${item.id}`} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver as aulas de ${item.nome}`}
            style={({ pressed }) => [estilos.cartao, pressed && { opacity: 0.9 }]}
          >
            <Text style={estilos.nome}>{item.nome}</Text>
          </Pressable>
        </Link>
      )}
      ListFooterComponent={
        <Pressable onPress={sair} accessibilityRole="button" style={estilos.sair}>
          <Text style={estilos.sairTexto}>Terminar sessão</Text>
        </Pressable>
      }
    />
  )
}

function Centro({ children }: { children: React.ReactNode }) {
  return <View style={estilos.centro}>{children}</View>
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: espaco.m, gap: espaco.s },
  avisos: {
    borderWidth: 1,
    borderColor: cores.contorno,
    borderRadius: raio.cartao,
    padding: espaco.m,
    marginBottom: espaco.s,
  },
  avisosTexto: { fontSize: 16, fontWeight: '600', color: cores.cianoTexto },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.cartao,
    padding: espaco.m,
    // 44 pontos é o alvo de toque mínimo recomendado; com este padding a
    // linha passa disso com folga.
    minHeight: 56,
    justifyContent: 'center',
  },
  nome: { fontSize: 17, fontWeight: '600', color: cores.texto },
  vazio: { padding: espaco.l, gap: espaco.s },
  vazioTitulo: { fontSize: 18, fontWeight: '600', color: cores.texto },
  vazioTexto: { fontSize: 15, color: cores.textoSuave, lineHeight: 22 },
  sair: { marginTop: espaco.xl, padding: espaco.m, alignItems: 'center' },
  sairTexto: { fontSize: 15, color: cores.textoSuave },
})
