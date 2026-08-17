import type { PerfisEscolaTipo, RecomendacaoEstado } from '@ccg/types'
import type { ClienteCcg } from './cliente'
import type { Resultado } from './escritas-professor'

// A área de administração.
//
// Nada aqui verifica se quem chama é administrador — e isso é
// deliberado. Quem o verifica é a RLS, através da função `eh_admin()`
// que as políticas usam. Um `if (perfil.admin)` no cliente esconderia os
// ecrãs, mas não protegia os dados; e um `if` que parece proteger é pior
// do que nenhum, porque convida a confiar nele.

export type NumerosDaEscola = {
  alunos: number
  professores: number
  contas: number
  pedidosPendentes: number
  matriculasConfirmadas: number
  recomendacoesPorValidar: number
}

export async function numerosDaEscola(supabase: ClienteCcg): Promise<NumerosDaEscola> {
  const [perfis, matriculas, recomendacoes, alunos] = await Promise.all([
    supabase.from('perfis_escola').select('tipo'),
    supabase.from('matriculas').select('estado'),
    supabase
      .from('recomendacoes')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'registada'),
    supabase.from('alunos').select('id', { count: 'exact', head: true }),
  ])

  const tipos = (perfis.data ?? []) as { tipo: PerfisEscolaTipo }[]
  const estados = (matriculas.data ?? []) as { estado: string }[]

  return {
    alunos: alunos.count ?? 0,
    professores: tipos.filter((p) => p.tipo === 'professor').length,
    contas: tipos.filter((p) => p.tipo === 'conta').length,
    pedidosPendentes: estados.filter((m) => m.estado === 'a_escolher').length,
    matriculasConfirmadas: estados.filter((m) => m.estado === 'confirmado').length,
    recomendacoesPorValidar: recomendacoes.count ?? 0,
  }
}

export type AlunoAdmin = {
  id: string
  nome: string
  data_nascimento: string | null
  encarregado_id: string
}

export async function listarTodosAlunos(supabase: ClienteCcg): Promise<AlunoAdmin[]> {
  const { data } = await supabase
    .from('alunos')
    .select('id, nome, data_nascimento, encarregado_id')
    .order('nome')

  return (data ?? []) as unknown as AlunoAdmin[]
}

export type ProfessorAdmin = {
  id: string
  nome: string
  admin: boolean
  programa: string | null
}

export async function listarProfessores(supabase: ClienteCcg): Promise<ProfessorAdmin[]> {
  const { data } = await supabase
    .from('perfis_escola')
    .select('id, admin, programa, profiles(nome)')
    .eq('tipo', 'professor')

  return ((data ?? []) as unknown as {
    id: string
    admin: boolean
    programa: string | null
    profiles: { nome: string } | null
  }[])
    .map((p) => ({
      id: p.id,
      nome: p.profiles?.nome ?? 'Sem nome',
      admin: p.admin,
      programa: p.programa,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

export type RecomendacaoAdmin = {
  id: number
  recomendador_nome: string
  novo_aluno_nome: string
  professor_nome: string
  modalidade: string | null
  estado: RecomendacaoEstado
  criado_em: string
}

export async function listarRecomendacoes(
  supabase: ClienteCcg
): Promise<RecomendacaoAdmin[]> {
  const { data } = await supabase
    .from('recomendacoes')
    .select(
      'id, recomendador_nome, novo_aluno_nome, professor_nome, modalidade, estado, criado_em'
    )
    .order('criado_em', { ascending: false })

  return (data ?? []) as unknown as RecomendacaoAdmin[]
}

// Validar uma recomendação é o que desbloqueia o benefício de quem
// recomendou. É por isso uma escrita com consequência em dinheiro, e não
// uma mudança de etiqueta.
export async function validarRecomendacao(
  supabase: ClienteCcg,
  id: number
): Promise<Resultado> {
  const { error } = await supabase
    .from('recomendacoes')
    .update({ estado: 'validada', data_validacao: new Date().toISOString().slice(0, 10) })
    .eq('id', id)

  return { erro: error ? 'Não foi possível validar. Tenta novamente.' : null }
}

export async function anularRecomendacao(
  supabase: ClienteCcg,
  id: number,
  motivo: string
): Promise<Resultado> {
  if (!motivo.trim()) {
    return { erro: 'Diz porque estás a anular — fica no registo.' }
  }

  const { error } = await supabase
    .from('recomendacoes')
    .update({ estado: 'anulada', motivo_anulacao: motivo.trim() })
    .eq('id', id)

  return { erro: error ? 'Não foi possível anular. Tenta novamente.' : null }
}

// Marcar uma mensalidade como paga. A identidade é (aluno, professor,
// ano, mês) desde a migração 0008 — não a matrícula.
export async function marcarMensalidadePaga(
  supabase: ClienteCcg,
  args: { alunoId: string; professorId: string; ano: number; mes: number; paga: boolean }
): Promise<Resultado> {
  const { error } = await supabase
    .from('mensalidades')
    .update({
      pago: args.paga,
      pago_em: args.paga ? new Date().toISOString() : null,
    })
    .eq('aluno_id', args.alunoId)
    .eq('professor_id', args.professorId)
    .eq('ano', args.ano)
    .eq('mes', args.mes)

  return { erro: error ? 'Não foi possível guardar. Tenta novamente.' : null }
}
