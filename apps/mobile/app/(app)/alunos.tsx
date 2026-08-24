import { palavra, plural } from '@ccg/core'
import { listarAlunosDoEncarregado, listarMatriculasDoAluno } from '@ccg/data'
import { Link, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { ACarregar, Cabecalho, CartaoTocavel, EstadoVazio } from '../../componentes/base'
import { BotaoPrincipal } from '../../componentes/formulario'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { espaco, texto, type Cores } from '../../lib/tema'
import { useEstilos, useTema } from '../../lib/tema-contexto'

type Item = {
  id: string
  nome: string
  dataNascimento: string | null
  confirmadas: number
  pendentes: number
}

export default function Alunos() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const { sessao } = useSessao()
  const router = useRouter()
  const [itens, setItens] = useState<Item[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [aRecarregar, setARecarregar] = useState(false)

  const carregar = useCallback(async () => {
    if (!sessao) return
    const alunos = await listarAlunosDoEncarregado(supabase, sessao.user.id)
    const comDetalhe = await Promise.all(
      alunos.map(async (a) => {
        const mats = await listarMatriculasDoAluno(supabase, a.id)
        return {
          id: a.id,
          nome: a.nome,
          dataNascimento: a.data_nascimento,
          confirmadas: mats.filter((m) => m.estado === 'confirmado').length,
          pendentes: mats.filter((m) => m.estado === 'a_escolher').length,
        }
      })
    )
    setItens(comDetalhe)
  }, [sessao])

  useEffect(() => {
    let ativo = true
    const buscar = async () => {
      await carregar()
      if (ativo) setACarregar(false)
    }
    void buscar()
    return () => {
      ativo = false
    }
  }, [carregar])

  if (aCarregar) return <ACarregar />

  return (
    <FlatList
      data={itens}
      keyExtractor={(i) => i.id}
      contentContainerStyle={estilos.lista}
      refreshControl={
        <RefreshControl
          refreshing={aRecarregar}
          onRefresh={() => {
            setARecarregar(true)
            carregar().finally(() => setARecarregar(false))
          }}
          tintColor={cores.azulFundo}
        />
      }
      ListHeaderComponent={
        <Cabecalho
          titulo="Alunos"
          descricao={
            itens.length > 0
              ? plural(itens.length, 'aluno a teu cargo', 'alunos a teu cargo')
              : undefined
          }
        />
      }
      ListEmptyComponent={
        <EstadoVazio
          titulo="Ainda não há alunos."
          descricao="Cria um aluno para cada pessoa que vai ter aulas — um filho, ou tu."
        />
      }
      ListFooterComponent={
        <View style={estilos.rodape}>
          <BotaoPrincipal texto="Criar aluno" onPress={() => router.push('/aluno/novo')} />
        </View>
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/aluno/[alunoId]', params: { alunoId: item.id, nome: item.nome, dataNascimento: item.dataNascimento ?? '' } }} asChild>
          <CartaoTocavel rotulo={`Ver ${item.nome}`}>
            <Text style={estilos.nome}>{item.nome}</Text>
            <Text style={estilos.resumo}>{resumir(item)}</Text>
          </CartaoTocavel>
        </Link>
      )}
    />
  )
}

// Uma linha de resumo em vez de dois números soltos: "2 aulas · 1 pedido
// à espera" lê-se de uma vez, "2 / 1" obriga a decifrar.
function resumir(item: Item): string {
  const partes: string[] = []
  if (item.confirmadas > 0) {
    partes.push(`${item.confirmadas} ${palavra(item.confirmadas, 'aula', 'aulas')}`)
  }
  if (item.pendentes > 0) {
    partes.push(
      `${item.pendentes} ${palavra(item.pendentes, 'pedido à espera', 'pedidos à espera')}`
    )
  }
  return partes.length > 0 ? partes.join(' · ') : 'Ainda sem aulas'
}

const criarEstilos = (cores: Cores) => StyleSheet.create({
  lista: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  nome: { ...texto.cartao, color: cores.tinta },
  resumo: { ...texto.pequeno, color: cores.tintaSuave },
  rodape: { marginTop: espaco.l },
})
