import type { SupabaseClient } from '@supabase/supabase-js'

// A Escola de Música para Bebés, do lado da leitura.
//
// Vive à parte porque a mesma pergunta — "esta pessoa dá alguma turma de
// Bebés?" — é feita em três sítios (a Home, a navegação e a própria
// página), e a resposta decide se o separador existe. Repetida em três
// ficheiros, divergia ao primeiro ajuste.

export type TurmaBebes = {
  id: number
  instrumento_id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  capacidade: number
  instrumentos: { nome: string } | null
}

// As turmas que esta pessoa dá. Vazio para toda a gente que não esteja
// atribuída — incluindo a secretaria, que gere a escola mas não lhe dá
// aulas, e por isso não vê a página do professor.
export async function turmasDoProfessor(
  supabase: SupabaseClient,
  professorId: string
): Promise<TurmaBebes[]> {
  const { data } = await supabase
    .from('turmas_bebes_professores')
    .select(
      'turmas_bebes(id, instrumento_id, dia_semana, hora_inicio, hora_fim, capacidade, instrumentos(nome))'
    )
    .eq('professor_id', professorId)

  const turmas = ((data ?? []) as unknown as { turmas_bebes: TurmaBebes | null }[])
    .map((linha) => linha.turmas_bebes)
    .filter((t): t is TurmaBebes => t !== null)

  // Por hora, para as duas turmas aparecerem sempre na ordem do sábado e
  // não na ordem em que foram atribuídas.
  return turmas.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
}

export async function daAlgumaTurmaDeBebes(
  supabase: SupabaseClient,
  professorId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('turmas_bebes_professores')
    .select('professor_id', { count: 'exact', head: true })
    .eq('professor_id', professorId)
  return (count ?? 0) > 0
}
