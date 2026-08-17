import {
  DIAS_SEMANA,
  formatarHora,
  formatarSala,
  palavra,
  type DiaSemana,
} from '@ccg/core'
import {
  ehProfessor,
  listarAlunosDoEncarregado,
  listarAulasDoProfessor,
  listarMatriculasDoAluno,
} from '@ccg/data'
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ACarregar, Cabecalho, Cartao, EstadoVazio } from '../../componentes/base'
import { usePerfil } from '../../lib/perfil'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco, texto } from '../../lib/tema'

type Aula = {
  chave: string
  dia: DiaSemana
  horaInicio: string
  horaFim: string
  titulo: string
  detalhe: string | null
  sala: string | null
}

// A semana inteira, por dia. É a vista que responde a "quando é que temos
// aulas", ao contrário do "Hoje", que responde a "o que é que se passa
// agora". A web tem as duas, e pela mesma razão.
export default function Agenda() {
  const { sessao } = useSessao()
  const { perfil } = usePerfil()
  const [aulas, setAulas] = useState<Aula[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [aRecarregar, setARecarregar] = useState(false)

  const professor = ehProfessor(perfil?.tipo)

  const carregar = useCallback(async () => {
    if (!sessao) return
    const uid = sessao.user.id

    if (professor) {
      const lista = await listarAulasDoProfessor(supabase, uid)
      setAulas(
        lista
          .filter((a) => a.horarios)
          .map((a) => ({
            chave: String(a.id),
            dia: a.horarios!.dia_semana,
            horaInicio: a.horarios!.hora_inicio,
            horaFim: a.horarios!.hora_fim,
            titulo: a.alunos?.nome ?? 'Aluno',
            detalhe: a.instrumentos?.nome ?? null,
            sala: formatarSala(a.horarios!.salas),
          }))
      )
      return
    }

    const alunos = await listarAlunosDoEncarregado(supabase, uid)
    const porAluno = await Promise.all(
      alunos.map(async (a) => ({ aluno: a, mats: await listarMatriculasDoAluno(supabase, a.id) }))
    )
    const todas: Aula[] = []
    for (const { aluno, mats } of porAluno) {
      for (const m of mats) {
        if (m.estado !== 'confirmado' || !m.horarios) continue
        todas.push({
          chave: `${aluno.id}-${m.id}`,
          dia: m.horarios.dia_semana,
          horaInicio: m.horarios.hora_inicio,
          horaFim: m.horarios.hora_fim,
          titulo: m.instrumentos?.nome ?? 'Aula',
          detalhe: aluno.nome,
          sala: formatarSala(m.horarios.salas),
        })
      }
    }
    setAulas(todas)
  }, [professor, sessao])

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

  // A ordem dos dias vem do DIAS_SEMANA do @ccg/core, e não de ordenar
  // texto: por ordem alfabética a semana começaria à quarta-feira.
  const porDia = DIAS_SEMANA.map((dia) => ({
    dia,
    aulas: aulas
      .filter((a) => a.dia === dia)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
  })).filter((d) => d.aulas.length > 0)

  return (
    <ScrollView
      contentContainerStyle={estilos.conteudo}
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
    >
      <Cabecalho
        titulo="Agenda"
        descricao={
          aulas.length > 0
            ? `${aulas.length} ${palavra(aulas.length, 'aula por semana', 'aulas por semana')}`
            : undefined
        }
      />

      {porDia.length === 0 ? (
        <EstadoVazio
          titulo="Sem aulas na semana."
          descricao={
            professor
              ? 'As aulas aparecem aqui depois de confirmares os horários.'
              : 'As aulas aparecem aqui depois de um professor confirmar o horário.'
          }
        />
      ) : (
        porDia.map(({ dia, aulas: doDia }) => (
          <View key={dia} style={estilos.grupo}>
            <Text style={estilos.dia}>{dia}</Text>
            {doDia.map((a) => (
              <Cartao key={a.chave}>
                <Text style={estilos.hora}>
                  {formatarHora(a.horaInicio)}–{formatarHora(a.horaFim)}
                </Text>
                <Text style={estilos.titulo}>{a.titulo}</Text>
                {(a.detalhe || a.sala) && (
                  <Text style={estilos.detalhe}>
                    {[a.detalhe, a.sala].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </Cartao>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.m, paddingBottom: espaco.xxl },
  grupo: { gap: espaco.s, marginBottom: espaco.l },
  dia: { ...texto.etiqueta, color: cores.azulTexto, marginBottom: espaco.xs },
  hora: { ...texto.pequeno, color: cores.tintaSuave },
  titulo: { ...texto.cartao, color: cores.tinta },
  detalhe: { ...texto.pequeno, color: cores.tintaSuave },
})
