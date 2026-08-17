import { formatarDataEscolar } from '@ccg/core'
import { listarNotificacoes, type Notificacao } from '@ccg/data'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { useSessao } from '../lib/sessao'
import { supabase } from '../lib/supabase'
import { cores, espaco, raio } from '../lib/tema'

// O `tipo` da notificação é um código da base de dados; aqui vira assunto
// legível. O esquema declara cinco, e por agora a app só cria o primeiro
// — os outros quatro estão aqui na mesma, para o dia em que passarem a
// ser escritos não aparecer um código cru a quem lê.
const ASSUNTO: Record<Notificacao['tipo'], string> = {
  pedido_aceite: 'Pedido aceite',
  lembrete_aula: 'Lembrete de aula',
  lembrete_pagamento: 'Lembrete de pagamento',
  mudanca_horario: 'Mudança de horário',
  novo_material: 'Novo material',
}

export default function Notificacoes() {
  const { sessao, aCarregar: sessaoACarregar } = useSessao()
  const [avisos, setAvisos] = useState<Notificacao[]>([])
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    if (!sessao) return
    listarNotificacoes(supabase, sessao.user.id)
      .then(setAvisos)
      .finally(() => setACarregar(false))
  }, [sessao])

  if (sessaoACarregar || aCarregar) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={cores.cianoTexto} />
      </View>
    )
  }

  if (!sessao) return <Redirect href="/entrar" />

  return (
    <FlatList
      data={avisos}
      keyExtractor={(n) => String(n.id)}
      contentContainerStyle={estilos.lista}
      ListEmptyComponent={
        <View style={estilos.vazio}>
          <Text style={estilos.vazioTitulo}>Não há avisos.</Text>
          <Text style={estilos.vazioTexto}>
            Quando houver novidades sobre as aulas, aparecem aqui.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={[estilos.cartao, !item.lida && estilos.porLer]}>
          <Text style={estilos.assunto}>{ASSUNTO[item.tipo] ?? 'Aviso'}</Text>
          <Text style={estilos.mensagem}>{item.mensagem}</Text>
          <Text style={estilos.data}>
            {formatarDataEscolar(item.criado_em.slice(0, 10))}
          </Text>
        </View>
      )}
    />
  )
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: espaco.m, gap: espaco.s },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.cartao,
    padding: espaco.m,
    gap: espaco.xs,
  },
  // Por ler distingue-se por uma barra à esquerda e não só por cor — quem
  // não distingue as duas cores continua a ver a diferença.
  porLer: {
    borderLeftWidth: 4,
    borderLeftColor: cores.ciano,
  },
  assunto: { fontSize: 13, fontWeight: '700', color: cores.cianoTexto },
  mensagem: { fontSize: 16, color: cores.texto, lineHeight: 22 },
  data: { fontSize: 13, color: cores.textoSuave },
  vazio: { padding: espaco.l, gap: espaco.s },
  vazioTitulo: { fontSize: 18, fontWeight: '600', color: cores.texto },
  vazioTexto: { fontSize: 15, color: cores.textoSuave, lineHeight: 22 },
})
