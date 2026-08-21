'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tiposForaDoPapel, type PapelAviso } from '@/lib/avisos'

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

  revalidatePath('/dashboard/avisos')
  revalidatePath('/dashboard')
}

// Marca como lidas as da CAIXA onde se carregou no botão, e só essas.
// Quem é professor e secretaria tem duas: sem o papel, carregar numa
// apagava silenciosamente os avisos por ler da outra — avisos que a
// pessoa nunca chegou a ver.
//
// Um papel desconhecido no formulário limpa tudo, como antes: é o
// comportamento de quem só tem uma caixa, e é o que faz o botão continuar
// a funcionar em qualquer página que o use sem passar o campo.
export async function marcarTodasNotificacoesLidas(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const papel = String(formData.get('papel') ?? '') as PapelAviso | ''
  const fora =
    papel === 'familia' || papel === 'professor' || papel === 'secretaria'
      ? await tiposForaDoPapel(papel)
      : []

  let consulta = supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('user_id', user.id)
    .eq('lida', false)

  if (fora.length > 0) {
    consulta = consulta.not('tipo', 'in', `(${fora.join(',')})`)
  }

  await consulta

  revalidatePath('/dashboard/avisos')
  revalidatePath('/admin/avisos')
  revalidatePath('/dashboard')
}
