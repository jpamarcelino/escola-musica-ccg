import type { ClienteCcg } from './cliente'

export type AlunoResumo = {
  id: string
  nome: string
}

// Os alunos a cargo de um encarregado de educação.
//
// Recebe o id em vez de o ir buscar à sessão: quem chama já sabe quem
// está autenticado, e assim a função não precisa de saber onde a sessão
// mora — cookies na web, armazenamento local na app. É o que a torna
// partilhável.
//
// Não é uma verificação de permissões: quem decide o que cada pessoa vê
// é a política de RLS da tabela `alunos`. Passar o id de outra pessoa
// não devolve os alunos dela; devolve uma lista vazia.
export async function listarAlunosDoEncarregado(
  supabase: ClienteCcg,
  encarregadoId: string
): Promise<AlunoResumo[]> {
  const { data } = await supabase
    .from('alunos')
    .select('id, nome')
    .eq('encarregado_id', encarregadoId)
    .order('nome')

  return data ?? []
}
