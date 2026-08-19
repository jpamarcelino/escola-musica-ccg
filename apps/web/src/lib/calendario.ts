import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ANO_LETIVO_FIM,
  ANO_LETIVO_INICIO,
  diaSemanaDaData,
  diasDeAulas,
  formatarHora,
  formatarSala,
  type DiaSemana,
} from '@ccg/core'

// Uma aula concreta, num dia concreto do calendário.
//
// Isto não existe na base de dados: `horarios` é uma grelha semanal e a
// matrícula diz qual das linhas o aluno ocupa. Para desenhar um ano
// inteiro é preciso espalhar essa grelha pelos dias de aulas — e é aqui
// que se faz, uma vez, para o calendário da família e o do professor.
export type TipoDeAula = 'aula' | 'reposicao' | 'desmarcada'

export type AulaNoCalendario = {
  data: string
  hora_inicio: string
  hora_fim: string
  titulo: string
  detalhe: string
  // A que "cor" pertence: um aluno, na conta da família; o próprio
  // professor, do outro lado. É o que liga o ponto no dia à legenda.
  grupo: string
  tipo: TipoDeAula
}

export type GrupoDoCalendario = { chave: string; nome: string }

export type DadosDoCalendario = {
  porData: Map<string, AulaNoCalendario[]>
  grupos: GrupoDoCalendario[]
}

type LinhaMatricula = {
  id: number
  aluno_id: string
  criado_em: string
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
  professor: { nome: string } | null
  horarios: {
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

function agrupar(aulas: AulaNoCalendario[]): Map<string, AulaNoCalendario[]> {
  const porData = new Map<string, AulaNoCalendario[]>()
  for (const aula of aulas) {
    const lista = porData.get(aula.data) ?? []
    lista.push(aula)
    porData.set(aula.data, lista)
  }
  for (const lista of porData.values()) {
    lista.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }
  return porData
}

// Espalha uma linha da grelha semanal pelos dias de aulas do ano.
//
// Começa na data da matrícula e não no início do ano: quem se inscreve em
// janeiro não teve aulas em outubro, e mostrá-las era inventar um
// passado. As desmarcadas saem — é o mesmo critério da agenda.
function ocorrencias(
  diaSemana: DiaSemana,
  desde: string,
  desmarcadas: ReadonlySet<string>,
  dias: string[]
): string[] {
  return dias.filter(
    (data) => data >= desde && diaSemanaDaData(data) === diaSemana && !desmarcadas.has(data)
  )
}

// O calendário de uma Conta CCG: todos os alunos da conta, cada um com a
// sua cor.
export async function calendarioDaFamilia(
  supabase: SupabaseClient,
  userId: string
): Promise<DadosDoCalendario> {
  const [{ data: matriculasData }, { data: alunosData }, { data: desmarcadasData }, { data: reposicoesData }] =
    await Promise.all([
      supabase
        .from('matriculas')
        .select(
          'id, aluno_id, criado_em, alunos!inner(nome, encarregado_id), instrumentos(nome), professor:profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
        )
        .eq('alunos.encarregado_id', userId)
        .eq('estado', 'confirmado')
        .not('horario_final_id', 'is', null),
      supabase.from('alunos').select('id, nome').eq('encarregado_id', userId).order('criado_em'),
      // As desmarcadas servem duas coisas: tirar a aula do dia e pôr lá,
      // no lugar dela, a palavra "desmarcada". Um dia que ficasse
      // simplesmente vazio não se distinguia de um dia sem aulas — e a
      // pergunta de quem desmarcou é justamente "ficou registado?".
      supabase
        .from('aulas_desmarcadas')
        .select('matricula_id, aluno_id, data, hora_inicio, hora_fim, instrumento_nome')
        .gte('data', ANO_LETIVO_INICIO)
        .lte('data', ANO_LETIVO_FIM),
      supabase
        .from('reposicoes')
        .select('id, aluno_id, data, hora_inicio, hora_fim, instrumento_nome')
        .gte('data', ANO_LETIVO_INICIO)
        .lte('data', ANO_LETIVO_FIM),
    ])

  const canceladas = new Map<number, Set<string>>()
  for (const d of desmarcadasData ?? []) {
    const atual = canceladas.get(d.matricula_id) ?? new Set<string>()
    atual.add(d.data)
    canceladas.set(d.matricula_id, atual)
  }

  const alunos = alunosData ?? []
  const nomePorAluno = new Map(alunos.map((a) => [a.id, a.nome]))
  const dias = diasDeAulas()
  const linhas = (matriculasData ?? []) as unknown as LinhaMatricula[]

  const aulas: AulaNoCalendario[] = []

  for (const m of linhas) {
    if (!m.horarios) continue
    const sala = formatarSala(m.horarios.salas)
    const detalhe = [
      `${formatarHora(m.horarios.hora_inicio)}–${formatarHora(m.horarios.hora_fim)}`,
      m.instrumentos?.nome,
      m.professor?.nome,
      sala,
    ]
      .filter(Boolean)
      .join(' · ')

    for (const data of ocorrencias(
      m.horarios.dia_semana,
      m.criado_em.slice(0, 10),
      canceladas.get(m.id) ?? new Set<string>(),
      dias
    )) {
      aulas.push({
        data,
        hora_inicio: m.horarios.hora_inicio,
        hora_fim: m.horarios.hora_fim,
        titulo: m.alunos?.nome ?? '',
        detalhe,
        grupo: m.aluno_id,
        tipo: 'aula',
      })
    }
  }

  for (const d of desmarcadasData ?? []) {
    if (!nomePorAluno.has(d.aluno_id)) continue
    aulas.push({
      data: d.data,
      hora_inicio: d.hora_inicio,
      hora_fim: d.hora_fim,
      titulo: nomePorAluno.get(d.aluno_id) ?? '',
      detalhe: `Desmarcada · ${formatarHora(d.hora_inicio)}–${formatarHora(d.hora_fim)}${d.instrumento_nome ? ` · ${d.instrumento_nome}` : ''}`,
      grupo: d.aluno_id,
      tipo: 'desmarcada',
    })
  }

  // As reposições são avulsas e podem cair em qualquer dia — incluindo um
  // que o calendário mostra a cinzento, se o professor assim a marcar.
  for (const r of reposicoesData ?? []) {
    if (!nomePorAluno.has(r.aluno_id)) continue
    aulas.push({
      data: r.data,
      hora_inicio: r.hora_inicio,
      hora_fim: r.hora_fim,
      titulo: nomePorAluno.get(r.aluno_id) ?? '',
      detalhe: `Reposição · ${formatarHora(r.hora_inicio)}–${formatarHora(r.hora_fim)}${r.instrumento_nome ? ` · ${r.instrumento_nome}` : ''}`,
      grupo: r.aluno_id,
      tipo: 'reposicao',
    })
  }

  // Só entram na legenda os alunos que têm mesmo aulas: uma cor sem
  // nenhum ponto no calendário é uma pergunta sem resposta.
  const comAulas = new Set(aulas.map((a) => a.grupo))

  return {
    porData: agrupar(aulas),
    grupos: alunos
      .filter((a) => comAulas.has(a.id))
      .map((a) => ({ chave: a.id, nome: a.nome })),
  }
}

// O calendário de um professor: as suas aulas, com o nome de quem vem.
export async function calendarioDoProfessor(
  supabase: SupabaseClient,
  professorId: string
): Promise<DadosDoCalendario> {
  const [{ data: matriculasData }, { data: desmarcadasData }, { data: reposicoesData }] =
    await Promise.all([
      supabase
        .from('matriculas')
        .select(
          'id, aluno_id, criado_em, alunos(nome), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
        )
        .eq('professor_id', professorId)
        .eq('estado', 'confirmado')
        .not('horario_final_id', 'is', null),
      supabase
        .from('aulas_desmarcadas')
        .select('matricula_id, aluno_id, data, hora_inicio, hora_fim, instrumento_nome')
        .eq('professor_id', professorId)
        .gte('data', ANO_LETIVO_INICIO)
        .lte('data', ANO_LETIVO_FIM),
      supabase
        .from('reposicoes')
        .select('id, aluno_id, data, hora_inicio, hora_fim, instrumento_nome')
        .eq('professor_id', professorId)
        .gte('data', ANO_LETIVO_INICIO)
        .lte('data', ANO_LETIVO_FIM),
    ])

  const canceladas = new Map<number, Set<string>>()
  for (const d of desmarcadasData ?? []) {
    const atual = canceladas.get(d.matricula_id) ?? new Set<string>()
    atual.add(d.data)
    canceladas.set(d.matricula_id, atual)
  }

  const dias = diasDeAulas()
  const linhas = (matriculasData ?? []) as unknown as LinhaMatricula[]
  const nomePorAluno = new Map(linhas.map((m) => [m.aluno_id, m.alunos?.nome ?? '']))
  const aulas: AulaNoCalendario[] = []

  for (const m of linhas) {
    if (!m.horarios) continue
    const sala = formatarSala(m.horarios.salas)
    for (const data of ocorrencias(
      m.horarios.dia_semana,
      m.criado_em.slice(0, 10),
      canceladas.get(m.id) ?? new Set<string>(),
      dias
    )) {
      aulas.push({
        data,
        hora_inicio: m.horarios.hora_inicio,
        hora_fim: m.horarios.hora_fim,
        titulo: m.instrumentos?.nome ?? m.alunos?.nome ?? '',
        detalhe: [
          `${formatarHora(m.horarios.hora_inicio)}–${formatarHora(m.horarios.hora_fim)}`,
          m.alunos?.nome,
          sala,
        ]
          .filter(Boolean)
          .join(' · '),
        // Um professor é um só: o calendário dele não precisa de cores
        // para distinguir pessoas, só de saber onde há aulas.
        grupo: 'aulas',
        tipo: 'aula',
      })
    }
  }

  for (const d of desmarcadasData ?? []) {
    aulas.push({
      data: d.data,
      hora_inicio: d.hora_inicio,
      hora_fim: d.hora_fim,
      titulo: d.instrumento_nome ?? '',
      detalhe: `Desmarcada · ${formatarHora(d.hora_inicio)}–${formatarHora(d.hora_fim)}${nomePorAluno.get(d.aluno_id) ? ` · ${nomePorAluno.get(d.aluno_id)}` : ''}`,
      grupo: 'aulas',
      tipo: 'desmarcada',
    })
  }

  for (const r of reposicoesData ?? []) {
    aulas.push({
      data: r.data,
      hora_inicio: r.hora_inicio,
      hora_fim: r.hora_fim,
      titulo: r.instrumento_nome ?? 'Reposição',
      detalhe: `Reposição · ${formatarHora(r.hora_inicio)}–${formatarHora(r.hora_fim)}${nomePorAluno.get(r.aluno_id) ? ` · ${nomePorAluno.get(r.aluno_id)}` : ''}`,
      grupo: 'aulas',
      tipo: 'reposicao',
    })
  }

  return { porData: agrupar(aulas), grupos: [] }
}
