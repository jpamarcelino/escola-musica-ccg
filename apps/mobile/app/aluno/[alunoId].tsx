import {
  agoraNaEscola,
  estadoTemporalAula,
  formatarDataEscolar,
  formatarHora,
  formatarSala,
  plural,
  proximaOcorrenciaDeAula,
} from '@ccg/core'
import { listarMatriculasDoAluno, type MatriculaDoAluno } from '@ccg/data'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco, raio } from '../../lib/tema'

export default function AulasDoAluno() {
  const { alunoId } = useLocalSearchParams<{ alunoId: string }>()
  const { sessao, aCarregar: sessaoACarregar } = useSessao()
  const [matriculas, setMatriculas] = useState<MatriculaDoAluno[]>([])
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    if (!alunoId) return
    listarMatriculasDoAluno(supabase, alunoId)
      .then(setMatriculas)
      .finally(() => setACarregar(false))
  }, [alunoId])

  // As mesmas contas que a página /aluno/[alunoId] da web faz, com as
  // mesmas funções — não é código parecido, é o mesmo ficheiro.
  const { aulas, pendentes, hoje } = useMemo(() => {
    const agora = agoraNaEscola()
    const confirmadas = matriculas
      .filter((m) => m.estado === 'confirmado' && m.horarios)
      .map((m) => ({
        ...m,
        data: proximaOcorrenciaDeAula(
          m.horarios!.dia_semana,
          m.horarios!.hora_inicio,
          m.horarios!.hora_fim,
          agora
        ),
      }))
      .sort(
        (a, b) =>
          a.data.localeCompare(b.data) ||
          a.horarios!.hora_inicio.localeCompare(b.horarios!.hora_inicio)
      )

    return {
      aulas: confirmadas,
      pendentes: matriculas.filter((m) => m.estado === 'a_escolher').length,
      hoje: agora,
    }
  }, [matriculas])

  if (sessaoACarregar || aCarregar) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={cores.cianoTexto} />
      </View>
    )
  }

  if (!sessao) return <Redirect href="/entrar" />

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      {pendentes > 0 ? (
        <View style={estilos.pendente}>
          <Text style={estilos.pendenteTexto}>
            {plural(pendentes, 'pedido à espera de horário', 'pedidos à espera de horário')}
          </Text>
        </View>
      ) : null}

      {aulas.length === 0 ? (
        <View style={estilos.vazio}>
          <Text style={estilos.vazioTitulo}>Ainda não há aulas confirmadas.</Text>
          <Text style={estilos.vazioTexto}>
            Assim que um professor confirmar um horário, a aula aparece aqui.
          </Text>
        </View>
      ) : (
        <>
          <Text style={estilos.resumo}>
            {plural(aulas.length, 'aula marcada', 'aulas marcadas')}
          </Text>
          {aulas.map((aula) => {
            const horario = aula.horarios!
            const estado = estadoTemporalAula(
              aula.data,
              horario.hora_inicio,
              horario.hora_fim,
              hoje
            )
            const sala = formatarSala(horario.salas)

            return (
              <View key={aula.id} style={estilos.cartao}>
                {estado === 'agora' ? (
                  <Text style={estilos.agora}>A decorrer</Text>
                ) : null}

                <Text style={estilos.disciplina}>
                  {aula.instrumentos?.nome ?? 'Aula'}
                </Text>

                <Text style={estilos.quando}>
                  {horario.dia_semana}, {formatarDataEscolar(aula.data)} ·{' '}
                  {formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}
                </Text>

                <Text style={estilos.detalhe}>
                  {aula.profiles?.nome ?? 'Professor por atribuir'}
                  {sala ? ` · ${sala}` : ''}
                </Text>
              </View>
            )
          })}
          <Text style={estilos.nota}>
            {aulas.length === 1
              ? 'A próxima ocorrência desta aula.'
              : 'A próxima ocorrência de cada aula.'}
          </Text>
        </>
      )}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conteudo: { padding: espaco.m, gap: espaco.s },
  resumo: {
    fontSize: 14,
    color: cores.textoSuave,
    marginBottom: espaco.xs,
  },
  pendente: {
    backgroundColor: '#FDF4E7',
    borderRadius: raio.cartao,
    padding: espaco.m,
    marginBottom: espaco.s,
  },
  pendenteTexto: { color: cores.aviso, fontSize: 15, fontWeight: '600' },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.cartao,
    padding: espaco.m,
    gap: espaco.xs,
  },
  agora: {
    color: cores.positivo,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  disciplina: { fontSize: 17, fontWeight: '600', color: cores.texto },
  quando: { fontSize: 15, color: cores.texto },
  detalhe: { fontSize: 14, color: cores.textoSuave },
  vazio: { padding: espaco.l, gap: espaco.s },
  vazioTitulo: { fontSize: 18, fontWeight: '600', color: cores.texto },
  vazioTexto: { fontSize: 15, color: cores.textoSuave, lineHeight: 22 },
  nota: {
    fontSize: 13,
    color: cores.textoSuave,
    marginTop: espaco.s,
    textAlign: 'center',
  },
})
