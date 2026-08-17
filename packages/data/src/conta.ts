import { MENSAGEM_CAMPOS_EM_FALTA, validarPassword } from '@ccg/core'
import type { PerfisEscolaTipo } from '@ccg/types'
import type { ClienteCcg } from './cliente'
import type { Resultado } from './escritas-professor'

export async function atualizarNome(
  supabase: ClienteCcg,
  userId: string,
  nome: string
): Promise<Resultado> {
  if (!nome.trim()) return { erro: 'O nome não pode ficar vazio.' }

  const { error } = await supabase
    .from('profiles')
    .update({ nome: nome.trim() })
    .eq('id', userId)

  return { erro: error ? 'Não foi possível atualizar o nome. Tenta novamente.' : null }
}

// Só uma Conta CCG muda o próprio email. Professores e administração são
// criados por convite, e o email é a identidade com que a escola os
// conhece — mudá-lo sozinho partiria essa ligação.
export async function atualizarEmail(
  supabase: ClienteCcg,
  tipo: PerfisEscolaTipo | null,
  email: string
): Promise<Resultado> {
  if (!email.trim()) return { erro: 'Indica o novo email.' }
  if (tipo !== 'conta') return { erro: 'Não tens permissão para alterar o email.' }

  const { error } = await supabase.auth.updateUser({ email: email.trim() })
  if (error) return { erro: error.message }

  return { erro: null }
}

// Pede a password atual antes de a mudar, e confirma-a a sério: faz uma
// autenticação com ela. Sem isso, um telemóvel desbloqueado e esquecido
// em cima da mesa chega para trocar a password de alguém.
export async function atualizarPassword(
  supabase: ClienteCcg,
  args: { email: string; atual: string; nova: string; repetir: string }
): Promise<Resultado> {
  if (!args.atual || !args.nova || !args.repetir) {
    return { erro: MENSAGEM_CAMPOS_EM_FALTA }
  }

  const problema = validarPassword(args.nova)
  if (problema) {
    // A mesma regra, com a palavra que diz de qual das passwords se fala.
    return { erro: problema.replace('A password', 'A nova password') }
  }

  if (args.nova !== args.repetir) {
    return { erro: 'As passwords novas não coincidem.' }
  }

  const { error: erroAtual } = await supabase.auth.signInWithPassword({
    email: args.email,
    password: args.atual,
  })
  if (erroAtual) {
    return { erro: 'A password atual está errada.' }
  }

  const { error } = await supabase.auth.updateUser({ password: args.nova })
  return { erro: error ? 'Não foi possível atualizar a password. Tenta novamente.' : null }
}

// Apagar é irreversível e leva tudo — alunos, matrículas, presenças. Não
// é um `delete` daqui: chama a função `apagar_propria_conta`, que é
// `security definer` e sabe a ordem por que as coisas têm de sair.
// Replicar essa ordem no cliente seria copiá-la para um sítio onde
// ninguém se lembraria de a manter.
export async function apagarPropriaConta(supabase: ClienteCcg): Promise<Resultado> {
  const { error } = await supabase.rpc('apagar_propria_conta')
  if (error) {
    return { erro: 'Não foi possível apagar a conta. Tenta novamente.' }
  }

  await supabase.auth.signOut()
  return { erro: null }
}
