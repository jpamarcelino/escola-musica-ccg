import type { DiaSemana } from '@ccg/core'
import type { HorarioEstado, InstrumentoPrograma } from '@ccg/types'
import type { ClienteCcg } from './cliente'

// A oferta da escola: que disciplinas há, quem as dá e a que horas.
//
// É a única parte do @ccg/data que se lê sem sessão — as políticas de
// RLS destas tabelas deixam qualquer pessoa ver a oferta, que é o que
// permite haver uma página pública de descoberta.

export type Instrumento = {
  id: number
  nome: string
  imagem_url: string | null
}

export async function listarInstrumentos(
  supabase: ClienteCcg,
  programa: InstrumentoPrograma
): Promise<Instrumento[]> {
  const { data } = await supabase
    .from('instrumentos')
    .select('id, nome, imagem_url')
    .eq('programa', programa)
    .order('nome')

  return (data ?? []) as unknown as Instrumento[]
}

export type ProfessorPublico = {
  professor_id: string
  nome: string
  foto_url: string | null
  especialidade: string | null
}

// Por RPC e não por query direta: `professores_publicos` é uma função
// `security definer` que decide o que se pode mostrar de um professor a
// quem não tem sessão. Replicar a query aqui contornaria essa decisão.
export async function listarProfessoresDoInstrumento(
  supabase: ClienteCcg,
  instrumentoId: number
): Promise<ProfessorPublico[]> {
  const { data } = await supabase.rpc('professores_publicos', {
    instrumento_id_param: instrumentoId,
  })

  return (data ?? []) as unknown as ProfessorPublico[]
}

export type HorarioPublico = {
  id: number
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fim: string
  estado: HorarioEstado
}

export async function listarHorariosPublicos(
  supabase: ClienteCcg,
  professorId: string
): Promise<HorarioPublico[]> {
  const { data } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, estado')
    .eq('professor_id', professorId)
    .order('hora_inicio')

  return (data ?? []) as unknown as HorarioPublico[]
}
