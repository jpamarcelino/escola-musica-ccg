import { calcularIdade, formatarDataEscolar, plural } from '@ccg/core'
import { listarPedidosPendentes, type PedidoPendente } from '@ccg/data'
import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text } from 'react-native'
import { ACarregar, Cabecalho, CartaoTocavel, EstadoVazio } from '../../componentes/base'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { espaco, texto, type Cores } from '../../lib/tema'
import { useEstilos, useTema } from '../../lib/tema-contexto'

export default function Pedidos() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const { sessao } = useSessao()
  const [pedidos, setPedidos] = useState<PedidoPendente[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [aRecarregar, setARecarregar] = useState(false)

  const carregar = useCallback(async () => {
    if (!sessao) return
    setPedidos(await listarPedidosPendentes(supabase, sessao.user.id))
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
      data={pedidos}
      keyExtractor={(p) => String(p.id)}
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
          titulo="Pedidos"
          descricao={
            pedidos.length > 0
              ? plural(pedidos.length, 'pedido à espera de horário', 'pedidos à espera de horário')
              : undefined
          }
        />
      }
      ListEmptyComponent={
        <EstadoVazio
          titulo="Nenhum pedido à espera."
          descricao="Quando alguém pedir uma aula contigo, aparece aqui."
        />
      }
      ListFooterComponent={
        pedidos.length > 0 ? (
          <Text style={estilos.nota}>Toca num pedido para confirmar ou recusar.</Text>
        ) : null
      }
      renderItem={({ item }) => {
        const idade = calcularIdade(item.alunos?.data_nascimento)
        return (
          <Link
            href={{
              pathname: '/professor/pedido/[matriculaId]',
              params: { matriculaId: String(item.id) },
            }}
            asChild
          >
          <CartaoTocavel rotulo={`Responder ao pedido de ${item.alunos?.nome ?? 'aluno'}`}>
            <Text style={estilos.nome}>{item.alunos?.nome ?? 'Aluno'}</Text>
            <Text style={estilos.detalhe}>
              {[
                item.instrumentos?.nome,
                idade !== null ? `${idade} anos` : null,
                `pedido a ${formatarDataEscolar(item.criado_em.slice(0, 10))}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {item.mensagem ? <Text style={estilos.mensagem}>“{item.mensagem}”</Text> : null}
          </CartaoTocavel>
          </Link>
        )
      }}
    />
  )
}

const criarEstilos = (cores: Cores) => StyleSheet.create({
  lista: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  nome: { ...texto.cartao, color: cores.tinta },
  detalhe: { ...texto.pequeno, color: cores.tintaSuave },
  // A mensagem é a voz de quem pediu — fica em itálico e recuada, para
  // se distinguir do que a app diz por si.
  mensagem: {
    ...texto.corpo,
    color: cores.tinta,
    fontStyle: 'italic',
    marginTop: espaco.xs,
  },
  nota: { ...texto.pequeno, color: cores.tintaSuave, marginTop: espaco.m, textAlign: 'center' },
})
