import { DIAS_SEMANA, calcularIdade, formatarHora, plural } from '@ccg/core'
import {
  confirmarPedido,
  listarAulasDoProfessor,
  listarHorariosDoProfessor,
  listarPedidosPendentes,
  recusarPedido,
  type HorarioDoProfessor,
  type PedidoPendente,
} from '@ccg/data'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ACarregar, Cabecalho, Cartao, EstadoVazio } from '../../../componentes/base'
import { BotaoPrincipal, BotaoSecundario, Mensagem } from '../../../componentes/formulario'
import { useSessao } from '../../../lib/sessao'
import { supabase } from '../../../lib/supabase'
import { espaco, raio, texto, type Cores } from '../../../lib/tema'
import { useEstilos, useTema } from '../../../lib/tema-contexto'

export default function ResponderPedido() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const { matriculaId } = useLocalSearchParams<{ matriculaId: string }>()
  const router = useRouter()
  const { sessao } = useSessao()

  const [pedido, setPedido] = useState<PedidoPendente | null>(null)
  const [livres, setLivres] = useState<HorarioDoProfessor[]>([])
  const [escolhido, setEscolhido] = useState<number | null>(null)
  const [aCarregar, setACarregar] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupacaoPorHorario, setOcupacaoPorHorario] = useState<Map<number, number>>(new Map())

  useEffect(() => {
    if (!sessao) return
    let ativo = true
    const buscar = async () => {
      const [pedidos, horarios, aulas] = await Promise.all([
        listarPedidosPendentes(supabase, sessao.user.id),
        listarHorariosDoProfessor(supabase, sessao.user.id),
        listarAulasDoProfessor(supabase, sessao.user.id),
      ])
      if (!ativo) return

      // Em dança vários alunos partilham a mesma faixa, por isso o que
      // torna uma faixa indisponível é estar bloqueada — não estar
      // ocupada. Mas mostrar quantos já lá estão ajuda a decidir.
      const ocupacao = new Map<number, number>()
      for (const a of aulas) {
        if (a.horario_final_id === null) continue
        ocupacao.set(a.horario_final_id, (ocupacao.get(a.horario_final_id) ?? 0) + 1)
      }

      setPedido(pedidos.find((p) => String(p.id) === matriculaId) ?? null)
      setLivres(horarios.filter((h) => h.estado !== 'bloqueado'))
      setOcupacaoPorHorario(ocupacao)
      setACarregar(false)
    }
    void buscar()
    return () => {
      ativo = false
    }
  }, [matriculaId, sessao])

  async function confirmar() {
    if (escolhido === null) return
    setErro(null)
    setOcupado(true)
    const { erro: falha } = await confirmarPedido(supabase, Number(matriculaId), escolhido)
    setOcupado(false)
    if (falha) {
      setErro(falha)
      return
    }
    router.back()
  }

  function recusar() {
    // Recusar apaga o pedido — não há como o desfazer. Uma confirmação
    // que diz o que vai acontecer, e não só "tens a certeza?".
    Alert.alert(
      'Recusar este pedido?',
      `O pedido de ${pedido?.alunos?.nome ?? 'este aluno'} é apagado e deixa de aparecer. ` +
        'Quem o fez pode voltar a pedir.',
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Recusar',
          style: 'destructive',
          onPress: async () => {
            setOcupado(true)
            const { erro: falha } = await recusarPedido(supabase, Number(matriculaId))
            setOcupado(false)
            if (falha) setErro(falha)
            else router.back()
          },
        },
      ]
    )
  }

  if (aCarregar) return <ACarregar />

  if (!pedido) {
    return (
      <>
        <Stack.Screen options={{ title: 'Pedido' }} />
        <View style={estilos.conteudo}>
          <EstadoVazio
            titulo="Este pedido já não existe."
            descricao="Pode ter sido respondido noutro sítio, ou cancelado por quem o fez."
          />
        </View>
      </>
    )
  }

  const idade = calcularIdade(pedido.alunos?.data_nascimento)
  const porDia = DIAS_SEMANA.map((dia) => ({
    dia,
    faixas: livres
      .filter((h) => h.dia_semana === dia)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
  })).filter((d) => d.faixas.length > 0)

  return (
    <>
      <Stack.Screen options={{ title: 'Responder ao pedido' }} />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Cabecalho
          sobretitulo={pedido.instrumentos?.nome ?? undefined}
          titulo={pedido.alunos?.nome ?? 'Aluno'}
          descricao={idade !== null ? `${idade} anos` : undefined}
        />

        {pedido.mensagem ? (
          <Cartao>
            <Text style={estilos.etiquetaMensagem}>O que escreveram</Text>
            <Text style={estilos.mensagem}>“{pedido.mensagem}”</Text>
          </Cartao>
        ) : null}

        <Text style={estilos.seccao}>Escolhe o horário</Text>

        {porDia.length === 0 ? (
          <EstadoVazio
            titulo="Não tens faixas disponíveis."
            descricao="Todas as tuas faixas estão bloqueadas. Desbloqueia uma para poderes confirmar."
          />
        ) : (
          porDia.map(({ dia, faixas }) => (
            <View key={dia} style={estilos.grupo}>
              <Text style={estilos.dia}>{dia}</Text>
              {faixas.map((h) => {
                const quantos = ocupacaoPorHorario.get(h.id) ?? 0
                const ativo = escolhido === h.id
                return (
                  <Pressable
                    key={h.id}
                    onPress={() => setEscolhido(ativo ? null : h.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: ativo }}
                    accessibilityLabel={`${dia} às ${formatarHora(h.hora_inicio)}`}
                    style={[estilos.faixa, ativo && estilos.faixaEscolhida]}
                  >
                    <Text style={[estilos.faixaHora, ativo && { color: cores.sobreAcento }]}>
                      {formatarHora(h.hora_inicio)}–{formatarHora(h.hora_fim)}
                    </Text>
                    <Text style={[estilos.faixaNota, ativo && { color: cores.sobreAcento }]}>
                      {quantos === 0
                        ? 'Livre'
                        : plural(quantos, 'aluno já marcado', 'alunos já marcados')}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ))
        )}

        {erro ? <Mensagem texto={erro} tom="erro" /> : null}

        <BotaoPrincipal
          texto="Confirmar aula"
          onPress={confirmar}
          ocupado={ocupado}
          desativado={escolhido === null}
        />
        <BotaoSecundario texto="Recusar pedido" onPress={recusar} tom="destrutivo" />
      </ScrollView>
    </>
  )
}

const criarEstilos = (cores: Cores) => StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  etiquetaMensagem: { ...texto.etiqueta, color: cores.azulTexto },
  mensagem: { ...texto.corpo, color: cores.tinta, fontStyle: 'italic' },
  seccao: { ...texto.seccao, color: cores.tinta, marginTop: espaco.m },
  grupo: { gap: espaco.xs, marginBottom: espaco.m },
  dia: { ...texto.etiqueta, color: cores.azulTexto, marginBottom: espaco.xs },
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.cartao,
    backgroundColor: cores.cartao,
    paddingHorizontal: espaco.m,
    minHeight: 52,
  },
  faixaEscolhida: { backgroundColor: cores.azulFundo, borderColor: cores.azulFundo },
  faixaHora: { ...texto.cartao, color: cores.tinta },
  faixaNota: { ...texto.pequeno, color: cores.tintaSuave },
})
