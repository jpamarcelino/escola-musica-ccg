import type { DiaSemana } from '@ccg/core'
import type { HorarioEstado } from '@ccg/types'
import type { ClienteCcg } from './cliente'

// As aulas que um professor tem marcadas, com aluno, disciplina e
// horário. Mesma projeção que a web usa no painel do professor.
export type AulaDoProfessor = {
  id: number
  horario_final_id: number | null
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
  horarios: {
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

const COLUNAS_AULA =
  'id, horario_final_id, alunos(nome), instrumentos(nome), ' +
  'horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'

export async function listarAulasDoProfessor(
  supabase: ClienteCcg,
  professorId: string
): Promise<AulaDoProfessor[]> {
  const { data } = await supabase
    .from('matriculas')
    .select(COLUNAS_AULA)
    .eq('professor_id', professorId)
    .eq('estado', 'confirmado')
    .not('horario_final_id', 'is', null)

  return (data ?? []) as unknown as AulaDoProfessor[]
}

export type HorarioDoProfessor = {
  id: number
  estado: HorarioEstado
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fim: string
}

export async function listarHorariosDoProfessor(
  supabase: ClienteCcg,
  professorId: string
): Promise<HorarioDoProfessor[]> {
  const { data } = await supabase
    .from('horarios')
    .select('id, estado, dia_semana, hora_inicio, hora_fim')
    .eq('professor_id', professorId)
    .order('dia_semana')
    .order('hora_inicio')

  return (data ?? []) as unknown as HorarioDoProfessor[]
}

// Pedidos de aula à espera de horário — o que a web mostra no separador
// "Pedidos". Vêm sem horário atribuído, por definição.
export type PedidoPendente = {
  id: number
  criado_em: string
  mensagem: string | null
  alunos: { nome: string; data_nascimento: string | null } | null
  instrumentos: { nome: string } | null
}

export async function listarPedidosPendentes(
  supabase: ClienteCcg,
  professorId: string
): Promise<PedidoPendente[]> {
  const { data } = await supabase
    .from('matriculas')
    .select('id, criado_em, mensagem, alunos(nome, data_nascimento), instrumentos(nome)')
    .eq('professor_id', professorId)
    .eq('estado', 'a_escolher')
    .order('criado_em', { ascending: false })

  return (data ?? []) as unknown as PedidoPendente[]
}

// Que matrículas já têm presença marcada numa data. Serve para saber
// quantas faltam — a app não marca presenças, mas diz quantas esperam.
export async function matriculasComPresencaMarcada(
  supabase: ClienteCcg,
  data: string,
  matriculaIds: number[]
): Promise<Set<number>> {
  if (matriculaIds.length === 0) return new Set()

  const { data: linhas } = await supabase
    .from('presencas')
    .select('matricula_id')
    .eq('data', data)
    .in('matricula_id', matriculaIds)

  return new Set((linhas ?? []).map((l) => (l as { matricula_id: number }).matricula_id))
}

// Os alunos de uma faixa de horário — quem aparece na chamada. Em música
// é um; em dança são vários, que é a razão de isto ser uma lista.
export type AlunoDaAula = {
  id: number
  aluno_id: string
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
}

export async function listarAlunosDoHorario(
  supabase: ClienteCcg,
  horarioId: number
): Promise<AlunoDaAula[]> {
  const { data } = await supabase
    .from('matriculas')
    .select('id, aluno_id, alunos(nome), instrumentos(nome)')
    .eq('horario_final_id', horarioId)
    .eq('estado', 'confirmado')

  return (data ?? []) as unknown as AlunoDaAula[]
}

// As presenças já marcadas numa data, para o ecrã abrir com o que lá está
// em vez de com tudo por marcar.
export async function presencasDaData(
  supabase: ClienteCcg,
  data: string,
  matriculaIds: number[]
): Promise<Map<number, string>> {
  if (matriculaIds.length === 0) return new Map()

  const { data: linhas } = await supabase
    .from('presencas')
    .select('matricula_id, estado')
    .eq('data', data)
    .in('matricula_id', matriculaIds)

  return new Map(
    (linhas ?? []).map((l) => {
      const linha = l as { matricula_id: number; estado: string }
      return [linha.matricula_id, linha.estado]
    })
  )
}
