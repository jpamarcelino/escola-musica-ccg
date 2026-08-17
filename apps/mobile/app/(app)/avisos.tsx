import { formatarDataEscolar } from '@ccg/core'
import { listarNotificacoes, type Notificacao } from '@ccg/data'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { ACarregar, Cabecalho, Cartao, Distintivo, EstadoVazio } from '../../componentes/base'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco, raio, texto } from '../../lib/tema'

// O `tipo` é um código da base de dados; aqui vira assunto legível. O
// esquema declara cinco e a app só cria um por agora — os outros quatro
// estão aqui na mesma, para o dia em que passarem a ser escritos não
// aparecer um código cru a quem lê.
const ASSUNTO: Record<Notificacao['tipo'], string> = {
  pedido_aceite: 'Pedido aceite',
  lembrete_aula: 'Lembrete de aula',
  lembrete_pagamento: 'Lembrete de pagamento',
  mudanca_horario: 'Mudança de horário',
  novo_material: 'Novo material',
}

export default function Avisos() {
  const { sessao } = useSessao()
  const [avisos, setAvisos] = useState<Notificacao[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [aRecarregar, setARecarregar] = useState(false)

  const carregar = useCallback(async () => {
    if (!sessao) return
    setAvisos(await listarNotificacoes(supabase, sessao.user.id))
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

  const porLer = avisos.filter((a) => !a.lida).length

  return (
    <FlatList
      data={avisos}
      keyExtractor={(n) => String(n.id)}
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
          titulo="Avisos"
          descricao={porLer > 0 ? `${porLer} por ler` : undefined}
        />
      }
      ListEmptyComponent={
        <EstadoVazio
          titulo="Não há avisos."
          descricao="Quando houver novidades sobre as aulas, aparecem aqui."
        />
      }
      renderItem={({ item }) => (
        <Cartao style={!item.lida ? estilos.porLer : undefined}>
          <View style={estilos.topo}>
            <Text style={estilos.assunto}>{ASSUNTO[item.tipo] ?? 'Aviso'}</Text>
            {!item.lida && <Distintivo texto="Novo" tom="azul" />}
          </View>
          <Text style={estilos.mensagem}>{item.mensagem}</Text>
          <Text style={estilos.data}>{formatarDataEscolar(item.criado_em.slice(0, 10))}</Text>
        </Cartao>
      )}
    />
  )
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  // Por ler distingue-se por uma barra à esquerda e não só por cor — quem
  // não distingue as duas cores continua a ver a diferença.
  porLer: {
    borderLeftWidth: 4,
    borderLeftColor: cores.azul,
    borderTopLeftRadius: raio.pequeno,
    borderBottomLeftRadius: raio.pequeno,
  },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  assunto: { ...texto.etiqueta, color: cores.azulTexto },
  mensagem: { ...texto.corpo, color: cores.tinta },
  data: { ...texto.pequeno, color: cores.tintaSuave },
})
