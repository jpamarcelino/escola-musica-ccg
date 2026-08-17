import type { ClienteCcg } from './cliente'
import type { Resultado } from './escritas-professor'

const FALHA_GENERICA = 'Não foi possível guardar. Tenta novamente.'

// Cria um aluno a cargo de quem está autenticado.
//
// O `encarregadoId` vem por parâmetro em vez de sair da sessão porque
// este pacote não conhece sessões — mas não é ele que dá a permissão: a
// política de RLS da tabela `alunos` só deixa criar para o próprio.
export async function criarAluno(
  supabase: ClienteCcg,
  args: { encarregadoId: string; nome: string; dataNascimento: string | null }
): Promise<{ erro: string | null; alunoId?: string }> {
  const { data, error } = await supabase
    .from('alunos')
    .insert({
      encarregado_id: args.encarregadoId,
      nome: args.nome.trim(),
      data_nascimento: args.dataNascimento || null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { erro: 'Não foi possível criar o perfil de aluno. Tenta novamente.' }
  }

  return { erro: null, alunoId: (data as { id: string }).id }
}

// Cria um pedido de aula, com as disponibilidades escolhidas.
//
// São duas escritas e não uma transação: primeiro a matrícula, depois os
// horários que a pessoa marcou. Se a segunda falhar fica um pedido sem
// disponibilidades — que é o mesmo que um pedido só com mensagem, e não
// deixa nada partido. É como a web o faz.
export async function pedirAula(
  supabase: ClienteCcg,
  args: {
    alunoId: string
    professorId: string
    instrumentoId: number
    mensagem: string
    horarioIds: number[]
  }
): Promise<Resultado> {
  if (args.horarioIds.length === 0 && !args.mensagem.trim()) {
    return { erro: 'Seleciona pelo menos um horário ou escreve uma mensagem.' }
  }

  const { data, error } = await supabase
    .from('matriculas')
    .insert({
      aluno_id: args.alunoId,
      professor_id: args.professorId,
      instrumento_id: args.instrumentoId,
      // 500 caracteres é o limite que a web impõe. Cortar aqui e não no
      // ecrã garante que vale para as duas frentes.
      mensagem: args.mensagem.trim().slice(0, 500) || null,
    })
    .select('id')
    .single()

  if (error) {
    // 23505 é a violação de unicidade: já existe um pedido ou uma aula
    // desta pessoa nesta disciplina. Dizer "tenta novamente" mandaria a
    // pessoa repetir o que nunca vai passar.
    if (error.code === '23505') {
      return { erro: 'Já existe um pedido ou uma aula confirmada nesta disciplina.' }
    }
    return { erro: 'Não foi possível criar o pedido. Tenta novamente.' }
  }

  if (args.horarioIds.length > 0) {
    const matriculaId = (data as { id: number }).id
    const { error: erroHorarios } = await supabase
      .from('disponibilidades_selecionadas')
      .insert(args.horarioIds.map((id) => ({ matricula_id: matriculaId, horario_id: id })))

    if (erroHorarios) {
      return { erro: 'O pedido foi criado, mas os horários não ficaram guardados.' }
    }
  }

  return { erro: null }
}

// Cancelar um pedido apaga-o. Um pedido cancelado não fica como registo
// — quem o fez pode voltar a pedir a mesma disciplina, e se ficasse a
// restrição de unicidade impedia-o.
export async function cancelarPedido(
  supabase: ClienteCcg,
  matriculaId: number
): Promise<Resultado> {
  const { error } = await supabase
    .from('matriculas')
    .delete()
    .eq('id', matriculaId)
    .eq('estado', 'a_escolher')

  return { erro: error ? FALHA_GENERICA : null }
}

export async function marcarNotificacaoLida(
  supabase: ClienteCcg,
  notificacaoId: number
): Promise<Resultado> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('id', notificacaoId)

  return { erro: error ? FALHA_GENERICA : null }
}

export async function marcarTodasLidas(
  supabase: ClienteCcg,
  userId: string
): Promise<Resultado> {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('user_id', userId)
    .eq('lida', false)

  return { erro: error ? FALHA_GENERICA : null }
}
