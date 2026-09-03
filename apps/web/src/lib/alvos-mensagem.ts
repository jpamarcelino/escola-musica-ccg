import type { SupabaseClient } from '@supabase/supabase-js'
import type { AlunoAlvo, ProfessorAlvo } from '@/components/mensagem-escola-form'

// Quem é que pode receber uma mensagem, e como se lê o nome de cada um.
//
// A lista é de ALUNOS e não de matrículas: quem anda em duas disciplinas
// é uma pessoa, recebe uma mensagem, e aparecer duas vezes numa lista de
// escolha era um convite a enviar-lhe a mesma coisa a dobrar. As
// disciplinas e os professores dessa pessoa ficam guardados em listas
// dentro da linha, que é o que faz os filtros funcionarem.
//
// Nada disto decide permissões — decide o que se mostra. Quem manda no
// alcance real de cada pessoa é `enviar_mensagem_escola` (migração
// 0042); passar por aqui uma lista maior não abriria porta nenhuma.

type Linha = {
  aluno_id: string
  professor_id: string
  alunos: { nome: string } | null
  instrumentos: { nome: string; programa: string } | null
  professor: { nome: string } | null
}

export async function carregarAlunosAlvo(
  supabase: SupabaseClient,
  // Preenchido quando é um professor a escrever: só os alunos dele.
  professorId?: string
): Promise<AlunoAlvo[]> {
  let consulta = supabase
    .from('matriculas')
    .select(
      'aluno_id, professor_id, alunos(nome), instrumentos(nome, programa), professor:profiles!matriculas_professor_id_fkey(nome)'
    )
    .eq('estado', 'confirmado')

  if (professorId) {
    consulta = consulta.eq('professor_id', professorId)
  }

  const { data } = await consulta
  const linhas = (data ?? []) as unknown as Linha[]

  const porAluno = new Map<string, AlunoAlvo>()

  for (const l of linhas) {
    const existente = porAluno.get(l.aluno_id)
    const disciplina = l.instrumentos?.nome
    const professor = l.professor?.nome
    const programa = l.instrumentos?.programa

    if (existente) {
      if (professor && !existente.professores.includes(l.professor_id)) {
        existente.professores.push(l.professor_id)
      }
      if (programa && !existente.programas.includes(programa)) {
        existente.programas.push(programa)
      }
      if (disciplina && !existente.disciplinas.includes(disciplina)) {
        existente.disciplinas.push(disciplina)
      }
      if (disciplina) existente.sub = `${existente.sub} · ${disciplina}`
      continue
    }

    porAluno.set(l.aluno_id, {
      id: l.aluno_id,
      nome: l.alunos?.nome ?? 'Sem nome',
      // Sem o professor quando é o próprio a ver a lista — sabe de quem
      // são os alunos que tem à frente.
      sub: [disciplina, professorId ? null : professor].filter(Boolean).join(' · '),
      professores: [l.professor_id],
      programas: programa ? [programa] : [],
      disciplinas: disciplina ? [disciplina] : [],
    })
  }

  return [...porAluno.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
}

type LinhaProfessor = {
  id: string
  programa: string | null
  profiles: { nome: string } | null
}

export async function carregarProfessoresAlvo(
  supabase: SupabaseClient
): Promise<ProfessorAlvo[]> {
  const { data } = await supabase
    .from('perfis_escola')
    .select('id, programa, profiles!inner(nome)')
    .eq('tipo', 'professor')

  const linhas = (data ?? []) as unknown as LinhaProfessor[]

  return linhas
    .map((l) => ({
      id: l.id,
      nome: l.profiles?.nome ?? 'Sem nome',
      sub: l.programa === 'danca' ? 'Dança' : l.programa === 'musica' ? 'Música' : '',
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
}
