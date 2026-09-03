import type { SupabaseClient } from '@supabase/supabase-js'

// Dentro da administração há dois papéis.
//
// A SECRETARIA trata da escola: lança mensalidades, regista
// recomendações, atribui disciplinas, mexe nas turmas de bebés. A
// DIREÇÃO vê exatamente o mesmo e não escreve nada — precisa dos
// números para decidir, não de mexer na caixa.
//
// A regra verdadeira está na base de dados, em `eh_secretaria()` e nas
// policies que ela guarda: um botão escondido não é uma permissão, e
// quem souber o endereço de uma ação chega lá na mesma. O que está aqui
// serve para as páginas não mostrarem botões que hão de falhar.
//
// Um super administrador é secretaria por definição, aqui como lá — em
// dois sítios com a mesma regra escrita duas vezes, um deles acaba
// esquecido.

export type PapelAdmin = {
  admin: boolean
  secretaria: boolean
  super_admin: boolean
}

export function ehSecretaria(papel: PapelAdmin | null | undefined): boolean {
  if (!papel?.admin) return false
  return papel.secretaria || papel.super_admin
}

// O que quase todas as páginas de /admin precisam de saber sobre quem
// está a ver. Devolve tudo a falso quando não há sessão ou perfil, para
// que quem chama não tenha de distinguir "não é" de "não sei".
export async function papelDoAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<PapelAdmin> {
  const { data } = await supabase
    .from('perfis_escola')
    .select('admin, secretaria, super_admin')
    .eq('id', userId)
    .maybeSingle()

  const row = data as PapelAdmin | null

  return {
    admin: row?.admin ?? false,
    secretaria: row?.secretaria ?? false,
    super_admin: row?.super_admin ?? false,
  }
}
