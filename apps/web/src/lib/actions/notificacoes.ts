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

// Apagar um aviso já lido.
//
// A caixa de entrada só crescia, e um aviso lido não tinha para onde ir.
// O gesto é o do iOS — arrastar da direita para a esquerda — e a
// confirmação vem depois, porque isto não se desfaz.
//
// O "lida" repetido aqui e na política de RLS (0057) não é desconfiança
// do próprio código: a interface só oferece o gesto nos lidos, esta linha
// trata de quem chame a acção por outro caminho, e a política trata de
// quem nem por aqui passe. Um aviso por ler é a única prova de que a app
// tentou dizer alguma coisa a alguém.
export async function apagarNotificacao(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const notificacaoId = Number(formData.get('notificacaoId') ?? 0)
  if (!Number.isInteger(notificacaoId) || notificacaoId <= 0) return

  await supabase
    .from('notificacoes')
    .delete()
    .eq('id', notificacaoId)
    .eq('user_id', user.id)
    .eq('lida', true)

  revalidatePath('/dashboard/avisos')
  revalidatePath('/admin/avisos')
  revalidatePath('/dashboard')
}
