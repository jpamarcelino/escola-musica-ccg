'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function marcarNotificacaoLida(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const notificacaoId = String(formData.get('notificacaoId') ?? '')

  await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('id', notificacaoId)
    .eq('user_id', user.id)

  revalidatePath('/aluno/notificacoes')
  revalidatePath('/dashboard')
}

export async function marcarTodasNotificacoesLidas() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('user_id', user.id)
    .eq('lida', false)

  revalidatePath('/aluno/notificacoes')
  revalidatePath('/dashboard')
}
