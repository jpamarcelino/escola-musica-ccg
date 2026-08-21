import type { DiaSemana } from '@ccg/core'
import type { MatriculaEstado, NotificacaoTipo } from '@ccg/types'
import type { ClienteCcg } from './cliente'

// A projeção que serve para mostrar as aulas de um aluno: o suficiente
// para dizer o quê, com quem, quando e onde. É a mesma que a página
// /aluno/[alunoId] da web já usava — mesma query, mesmas colunas.
export type MatriculaDoAluno = {
  id: number
  estado: MatriculaEstado
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
  horarios: {
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

// Duas colunas de estado, não uma: 'confirmado' são as aulas a decorrer e
// 'a_escolher' são pedidos à espera de horário. Quem chama precisa dos
// dois — uma app que só mostrasse os confirmados deixava um encarregado
// sem saber que tem um pedido pendente.
const ESTADOS_VISIVEIS: MatriculaEstado[] = ['a_escolher', 'confirmado']

const COLUNAS =
  'id, estado, instrumentos(nome), profiles!matriculas_professor_id_fkey(nome), ' +
  'horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'

export async function listarMatriculasDoAluno(
  supabase: ClienteCcg,
  alunoId: string
): Promise<MatriculaDoAluno[]> {
  const { data } = await supabase
    .from('matriculas')
    .select(COLUNAS)
    .eq('aluno_id', alunoId)
    .in('estado', ESTADOS_VISIVEIS)

  return (data ?? []) as unknown as MatriculaDoAluno[]
}

// Quantas notificações a pessoa ainda não leu. `head: true` pede só a
// contagem — não traz as linhas, que aqui não servem para nada.
//
// `tiposExcluidos` deixa de fora os avisos de outro papel da mesma conta
// (migração 0047): quem é professor e secretaria vê duas caixas, e o
// ponto vermelho de uma não pode acender por causa da outra — seria um
// ponto que nunca apagava, por mais que se lesse.
export async function contarNotificacoesPorLer(
  supabase: ClienteCcg,
  userId: string,
  tiposExcluidos: string[] = []
): Promise<number> {
  let consulta = supabase
    .from('notificacoes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('lida', false)

  if (tiposExcluidos.length > 0) {
    consulta = consulta.not('tipo', 'in', `(${tiposExcluidos.join(',')})`)
  }

  const { count } = await consulta

  return count ?? 0
}

// A tabela não tem título: a notificação é uma frase só, em `mensagem`,
// e o `tipo` é que diz de que assunto se trata.
export type Notificacao = {
  id: number
  tipo: NotificacaoTipo
  mensagem: string
  lida: boolean
  criado_em: string
}

export async function listarNotificacoes(
  supabase: ClienteCcg,
  userId: string
): Promise<Notificacao[]> {
  const { data } = await supabase
    .from('notificacoes')
    .select('id, tipo, mensagem, lida, criado_em')
    .eq('user_id', userId)
    .order('criado_em', { ascending: false })
    .limit(50)

  return (data ?? []) as unknown as Notificacao[]
}
