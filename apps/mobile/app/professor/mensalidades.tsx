import {
  MESES_ANO_LETIVO,
  ROTULO_MENSALIDADE,
  estadoMensalidade,
  euros,
  eurosOuTexto,
  plural,
  rotuloMes,
  totalPorReceber,
  type EstadoMensalidade,
} from '@ccg/core'
import { listarMatriculasParaCobranca, listarMensalidadesDoMes } from '@ccg/data'
import { Stack } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  ACarregar,
  Cabecalho,
  Cartao,
  Distintivo,
  EstadoVazio,
  type TomDistintivo,
} from '../../componentes/base'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco, raio, texto } from '../../lib/tema'

type Linha = {
  chave: number
  nome: string
  disciplina: string
  valor: number | null
  estado: EstadoMensalidade
}

// O tom da cor reforça o estado mas não o carrega — o texto do distintivo
// diz sempre o que é, para quem não distingue as cores.
const TOM: Record<EstadoMensalidade, TomDistintivo> = {
  por_pagar: 'aviso',
  paga: 'positivo',
  nao_devida: 'azul',
  desistencia: 'neutro',
  por_gerar: 'neutro',
}

export default function Mensalidades() {
  const { sessao } = useSessao()
  const hoje = new Date()
  const indiceInicial = Math.max(
    0,
    MESES_ANO_LETIVO.findIndex(
      (m) => m.ano === hoje.getFullYear() && m.mes === hoje.getMonth() + 1
    )
  )
  const [indice, setIndice] = useState(indiceInicial)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [aCarregar, setACarregar] = useState(true)

  const mes = MESES_ANO_LETIVO[indice]

  const carregar = useCallback(async () => {
    if (!sessao) return
    const [matriculas, mensalidades] = await Promise.all([
      listarMatriculasParaCobranca(supabase, sessao.user.id),
      listarMensalidadesDoMes(supabase, sessao.user.id, mes.ano, mes.mes),
    ])

    // A identidade de uma mensalidade é (aluno, professor, ano, mês) desde
    // a migração 0008 — não a matrícula. Por isso a chave aqui é o aluno.
    const porAluno = new Map(mensalidades.map((m) => [m.aluno_id, m]))

    setLinhas(
      matriculas
        .map((m) => {
          const mensalidade = porAluno.get(m.aluno_id)
          return {
            chave: m.id,
            nome: m.alunos?.nome ?? '',
            disciplina: m.instrumentos?.nome ?? mensalidade?.instrumento_nome ?? '',
            valor: mensalidade?.valor ?? m.valor_mensal,
            estado: estadoMensalidade(mensalidade),
          }
        })
        .sort((a, b) => a.nome.localeCompare(b.nome))
    )
  }, [mes.ano, mes.mes, sessao])

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

  const porPagar = linhas.filter((l) => l.estado === 'por_pagar')
  const aReceber = totalPorReceber(linhas)

  return (
    <>
      <Stack.Screen options={{ title: 'Mensalidades' }} />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Cabecalho
          sobretitulo={rotuloMes(mes.ano, mes.mes)}
          titulo="Mensalidades"
          descricao={
            porPagar.length > 0
              ? `${plural(porPagar.length, 'aluno por pagar', 'alunos por pagar')} · ${euros(aReceber)} a receber`
              : 'Nada por receber neste mês.'
          }
        />

        {/* Navegar mês a mês, e não um seletor com doze entradas: num
            telemóvel um menu longo custa mais do que dois toques, e o
            que se quer quase sempre é o mês ao lado. */}
        <View style={estilos.navegacao}>
          <Pressable
            onPress={() => setIndice((i) => Math.max(0, i - 1))}
            disabled={indice === 0}
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            style={[estilos.seta, indice === 0 && estilos.setaInativa]}
          >
            <Text style={estilos.setaTexto}>‹</Text>
          </Pressable>
          <Text style={estilos.mesAtual}>{rotuloMes(mes.ano, mes.mes)}</Text>
          <Pressable
            onPress={() => setIndice((i) => Math.min(MESES_ANO_LETIVO.length - 1, i + 1))}
            disabled={indice === MESES_ANO_LETIVO.length - 1}
            accessibilityRole="button"
            accessibilityLabel="Mês seguinte"
            style={[
              estilos.seta,
              indice === MESES_ANO_LETIVO.length - 1 && estilos.setaInativa,
            ]}
          >
            <Text style={estilos.setaTexto}>›</Text>
          </Pressable>
        </View>

        {linhas.length === 0 ? (
          <EstadoVazio
            titulo="Sem alunos a cobrar."
            descricao="As mensalidades aparecem aqui depois de teres matrículas confirmadas."
          />
        ) : (
          linhas.map((l) => (
            <Cartao key={l.chave}>
              <View style={estilos.linhaTopo}>
                <Text style={estilos.nome}>{l.nome}</Text>
                <Text style={estilos.valor}>{eurosOuTexto(l.valor, '—')}</Text>
              </View>
              <Text style={estilos.disciplina}>{l.disciplina}</Text>
              <Distintivo texto={ROTULO_MENSALIDADE[l.estado]} tom={TOM[l.estado]} />
            </Cartao>
          ))
        )}

        {linhas.length > 0 && (
          <Text style={estilos.nota}>
            Marcar como paga faz-se no site — a app mostra o estado.
          </Text>
        )}
      </ScrollView>
    </>
  )
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  navegacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espaco.s,
  },
  seta: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raio.pilula,
    borderWidth: 1,
    borderColor: cores.linha,
  },
  setaInativa: { opacity: 0.35 },
  setaTexto: { fontSize: 24, color: cores.azulFundo, marginTop: -3 },
  mesAtual: { ...texto.cartao, color: cores.tinta },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nome: { ...texto.cartao, color: cores.tinta, flex: 1 },
  // Os valores alinham-se pelos dígitos, não pela largura de cada
  // algarismo — sem isto uma coluna de dinheiro dança.
  valor: { ...texto.corpo, color: cores.tinta, fontVariant: ['tabular-nums'] },
  disciplina: { ...texto.pequeno, color: cores.tintaSuave },
  nota: { ...texto.pequeno, color: cores.tintaSuave, marginTop: espaco.m, textAlign: 'center' },
})
