'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Dar acesso de administração a uma pessoa, e tirá-lo.
//
// Substituem uma acção que reescrevia a coluna `admin` de todos os
// professores de uma vez, a partir de uma lista de caixas: para promover
// uma pessoa gravavam-se dezoito linhas, e bastava uma caixa desmarcada
// por engano para despromover quem lá estava.
//
// As duas passam pela mesma função na base de dados, que é quem verifica
// se quem chama é super administrador. Aqui em cima não há verificação
// nenhuma de propósito: uma regra desta importância escrita em dois
// sítios é uma regra que um dia diverge.
async function definirAdministrador(userId: string, admin: boolean, destino: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.rpc('definir_administrador', {
    p_user_id: userId,
    p_admin: admin,
  })

  if (error) {
    redirect(`${destino}?erro=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/administradores')
  redirect(destino)
}

export async function tornarAdministrador(formData: FormData) {
  const userId = String(formData.get('userId') ?? '')
  await definirAdministrador(userId, true, '/admin/administradores')
}

export async function removerAdministrador(formData: FormData) {
  const userId = String(formData.get('userId') ?? '')
  await definirAdministrador(userId, false, '/admin/administradores')
}
