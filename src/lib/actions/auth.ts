'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; info?: string } | undefined

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const tipo = String(formData.get('tipo') ?? '')

  if (!nome || !email || !password || (tipo !== 'aluno' && tipo !== 'professor')) {
    return { error: 'Preenche todos os campos.' }
  }
  if (password.length < 6) {
    return { error: 'A password deve ter pelo menos 6 caracteres.' }
  }

  if (tipo === 'professor') {
    const codigoProfessor = String(formData.get('codigoProfessor') ?? '').trim()
    if (!codigoProfessor || codigoProfessor !== process.env.PROFESSOR_INVITE_CODE) {
      return { error: 'Código de professor inválido.' }
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nome, tipo } },
  })

  if (error) {
    return { error: error.message }
  }

  // Se a confirmação de email estiver ativa no Supabase, ainda não há sessão
  // criada nesta fase — o utilizador só consegue entrar depois de confirmar.
  if (!data.session) {
    return {
      info: 'Conta criada! Verifica o teu email para confirmares a conta antes de entrares.',
    }
  }

  redirect('/dashboard')
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Preenche todos os campos.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ou password incorretos.' }
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
