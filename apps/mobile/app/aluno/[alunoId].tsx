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
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native'
import { ACarregar, Cabecalho, Cartao, Distintivo, EstadoVazio } from '../../componentes/base'
import { supabase } from '../../lib/supabase'
import { cores, espaco, texto } from '../../lib/tema'

export default function AulasDoAluno() {
  const { alunoId, nome } = useLocalSearchParams<{ alunoId: string; nome?: string }>()
  const [matriculas, setMatriculas] = useState<MatriculaDoAluno[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [aRecarregar, setARecarregar] = useState(false)

  useEffect(() => {
    if (!alunoId) return
    let ativo = true
    const buscar = async () => {
      const lista = await listarMatriculasDoAluno(supabase, alunoId)
      if (!ativo) return
      setMatriculas(lista)
      setACarregar(false)
    }
    void buscar()
    return () => {
      ativo = false
    }
  }, [alunoId])

  // As mesmas contas que a página /aluno/[alunoId] da web faz, com as
  // mesmas funções — não é código parecido, é o mesmo ficheiro.
  const { aulas, pendentes, agora } = useMemo(() => {
    const momento = agoraNaEscola()
    const confirmadas = matriculas
      .filter((m) => m.estado === 'confirmado' && m.horarios)
      .map((m) => ({
        ...m,
        data: proximaOcorrenciaDeAula(
          m.horarios!.dia_semana,
          m.horarios!.hora_inicio,
          m.horarios!.hora_fim,
          momento
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
      agora: momento,
    }
  }, [matriculas])

  if (aCarregar) return <ACarregar />

  return (
    <>
      <Stack.Screen options={{ title: nome ?? 'Aulas' }} />
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={aRecarregar}
            onRefresh={() => {
              setARecarregar(true)
              listarMatriculasDoAluno(supabase, alunoId)
                .then(setMatriculas)
                .finally(() => setARecarregar(false))
            }}
            tintColor={cores.azulFundo}
          />
        }
      >
        <Cabecalho
          titulo={nome ?? 'Aulas'}
          descricao={
            aulas.length > 0
              ? plural(aulas.length, 'aula marcada', 'aulas marcadas')
              : undefined
          }
        />

        {pendentes > 0 && (
          <Cartao style={estilos.pendente}>
            <Distintivo
              texto={plural(pendentes, 'pedido à espera de horário', 'pedidos à espera de horário')}
              tom="aviso"
            />
          </Cartao>
        )}

        {aulas.length === 0 ? (
          // Dois vazios diferentes, e dizê-lo importa: quem tem um pedido
          // à espera precisa de saber que está a andar; quem não tem
          // nenhum precisa de saber que a bola está do seu lado.
          pendentes > 0 ? (
            <EstadoVazio
              titulo="Ainda não há aulas confirmadas."
              descricao="Assim que um professor confirmar o horário, a aula aparece aqui."
            />
          ) : (
            <EstadoVazio
              titulo="Ainda não há aulas."
              descricao="Para começar, faz um pedido de aula no site da escola. Depois de um professor confirmar o horário, as aulas aparecem aqui."
            />
          )
        ) : (
          <>
            {aulas.map((aula) => {
              const h = aula.horarios!
              const estado = estadoTemporalAula(aula.data, h.hora_inicio, h.hora_fim, agora)
              const sala = formatarSala(h.salas)

              return (
                <Cartao key={aula.id}>
                  {estado === 'agora' && <Distintivo texto="A decorrer" tom="positivo" />}
                  <Text style={estilos.disciplina}>{aula.instrumentos?.nome ?? 'Aula'}</Text>
                  <Text style={estilos.quando}>
                    {h.dia_semana}, {formatarDataEscolar(aula.data)} ·{' '}
                    {formatarHora(h.hora_inicio)}–{formatarHora(h.hora_fim)}
                  </Text>
                  <Text style={estilos.detalhe}>
                    {[aula.profiles?.nome ?? 'Professor por atribuir', sala]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Cartao>
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
    </>
  )
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  pendente: { backgroundColor: cores.papel2, borderColor: cores.linha },
  disciplina: { ...texto.cartao, color: cores.tinta },
  quando: { ...texto.corpo, color: cores.tinta },
  detalhe: { ...texto.pequeno, color: cores.tintaSuave },
  nota: { ...texto.pequeno, color: cores.tintaSuave, marginTop: espaco.s, textAlign: 'center' },
})
