import type { PerfisEscolaPrograma, PerfisEscolaTipo } from '@ccg/types'
import type { ClienteCcg } from './cliente'

export type PerfilEscola = {
  nome: string
  tipo: PerfisEscolaTipo | null
  admin: boolean
  programa: PerfisEscolaPrograma | null
}

// Quem é a pessoa autenticada, do ponto de vista da escola.
//
// O `tipo` decide o que a aplicação mostra: uma Conta CCG gere alunos,
// um professor dá aulas. É a mesma consulta que a web faz em
// lib/auth-context.ts — o nome vem de `profiles` e o resto de
// `perfis_escola`.
export async function obterPerfilEscola(
  supabase: ClienteCcg,
  userId: string
): Promise<PerfilEscola | null> {
  const { data } = await supabase
    .from('profiles')
    .select('nome, perfis_escola(tipo, admin, programa)')
    .eq('id', userId)
    .maybeSingle()

  if (!data) return null

  // Esta é a fronteira onde os dados chegam sem tipo. Os valores são
  // garantidos pela constraint CHECK da tabela — é dela que estas uniões
  // saem (ver @ccg/types).
  const linha = data as unknown as {
    nome: string
    perfis_escola: {
      tipo: PerfisEscolaTipo
      admin: boolean
      programa: PerfisEscolaPrograma | null
    } | null
  }

  return {
    nome: linha.nome,
    tipo: linha.perfis_escola?.tipo ?? null,
    admin: linha.perfis_escola?.admin ?? false,
    programa: linha.perfis_escola?.programa ?? null,
  }
}

// Uma Conta CCG é o perfil de quem gere alunos, por oposição a professor
// e a admin. Chamava-se 'aluno' até à migração 0025, nome que confundia a
// conta com a pessoa que tem aulas.
//
// Continua a ser uma função e não uma comparação solta pela mesma razão
// que na web: é o sítio único onde este conceito está definido.
export function ehContaCcg(tipo: PerfisEscolaTipo | null | undefined): boolean {
  return tipo === 'conta'
}

export function ehProfessor(tipo: PerfisEscolaTipo | null | undefined): boolean {
  return tipo === 'professor'
}
