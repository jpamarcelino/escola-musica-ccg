import { ehContaCcg, ehProfessor } from '@ccg/data'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Cabecalho, Cartao, Distintivo } from '../../componentes/base'
import { usePerfil } from '../../lib/perfil'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco, raio, texto } from '../../lib/tema'

export default function Conta() {
  const router = useRouter()
  const { sessao } = useSessao()
  const { perfil } = usePerfil()

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/entrar')
  }

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Cabecalho titulo="Conta" />

      <Cartao>
        <Text style={estilos.nome}>{perfil?.nome ?? 'Sem nome'}</Text>
        <Text style={estilos.email}>{sessao?.user.email}</Text>
        <View style={estilos.papeis}>
          <Distintivo texto={rotuloPapel(perfil?.tipo)} tom="azul" />
          {perfil?.admin && <Distintivo texto="Administração" tom="neutro" />}
        </View>
      </Cartao>

      {/* O que a app não faz, dito onde a pessoa o iria procurar. Um ecrã
          de conta sem nada para editar parece avariado; a dizer porquê,
          não parece. */}
      <Cartao>
        <Text style={estilos.aviso}>
          Alterar o nome, o email ou a password faz-se no site. Nesta versão a app
          serve para consultar.
        </Text>
      </Cartao>

      <Pressable onPress={sair} accessibilityRole="button" style={estilos.sair}>
        <Text style={estilos.sairTexto}>Terminar sessão</Text>
      </Pressable>
    </ScrollView>
  )
}

function rotuloPapel(tipo: string | null | undefined): string {
  if (ehProfessor(tipo as never)) return 'Professor'
  if (ehContaCcg(tipo as never)) return 'Conta CCG'
  if (tipo === 'admin') return 'Administração'
  return 'Sem perfil'
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  nome: { ...texto.seccao, color: cores.tinta },
  email: { ...texto.pequeno, color: cores.tintaSuave },
  papeis: { flexDirection: 'row', gap: espaco.xs, marginTop: espaco.xs },
  aviso: { ...texto.pequeno, color: cores.tintaSuave },
  sair: {
    marginTop: espaco.l,
    padding: espaco.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.pilula,
  },
  sairTexto: { ...texto.corpo, color: cores.erro },
})
