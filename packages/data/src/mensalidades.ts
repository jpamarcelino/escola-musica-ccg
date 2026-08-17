import type { MensalidadeParaEstado } from '@ccg/core'
import type { ClienteCcg } from './cliente'

export type MatriculaParaCobranca = {
  id: number
  aluno_id: string
  valor_mensal: number | null
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
}

export type MensalidadeDoMes = MensalidadeParaEstado & {
  aluno_id: string
  valor: number | null
  instrumento_nome: string | null
}

export async function listarMatriculasParaCobranca(
  supabase: ClienteCcg,
  professorId: string
): Promise<MatriculaParaCobranca[]> {
  const { data } = await supabase
    .from('matriculas')
    .select('id, aluno_id, valor_mensal, alunos(nome), instrumentos(nome)')
    .eq('professor_id', professorId)
    .eq('estado', 'confirmado')

  return (data ?? []) as unknown as MatriculaParaCobranca[]
}

// A identidade de uma mensalidade é (aluno, professor, ano, mês) desde a
// migração 0008 — não a matrícula. Quem consumir isto deve indexar por
// aluno_id, ou uma pessoa com duas disciplinas aparece a dever duas vezes.
export async function listarMensalidadesDoMes(
  supabase: ClienteCcg,
  professorId: string,
  ano: number,
  mes: number
): Promise<MensalidadeDoMes[]> {
  const { data } = await supabase
    .from('mensalidades')
    .select('aluno_id, valor, pago, desistencia, beneficio_id, instrumento_nome')
    .eq('professor_id', professorId)
    .eq('ano', ano)
    .eq('mes', mes)

  return (data ?? []) as unknown as MensalidadeDoMes[]
}
