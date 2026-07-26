'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { calcularIdade } from '@/lib/idade'

async function origem() {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocolo = host?.startsWith('localhost') ? 'http' : 'https'
  return `${protocolo}://${host}`
}

export type AuthState = { error?: string; info?: string } | undefined

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const tipo = String(formData.get('tipo') ?? '')
  const telefone = String(formData.get('telefone') ?? '').trim()

  if (!nome || !email || !password || (tipo !== 'aluno' && tipo !== 'professor')) {
    return { error: 'Preenche todos os campos.' }
  }
  if (password.length < 6) {
    return { error: 'A password deve ter pelo menos 6 caracteres.' }
  }
  // Aceita vários formatos (com/sem indicativo, espaços, traços) — só
  // confirma que há dígitos suficientes para ser um número a sério.
  if (telefone.replace(/[^0-9]/g, '').length < 9) {
    return { error: 'Indica um número de telemóvel válido.' }
  }

  let dataNascimento: string | null = null
  if (tipo === 'aluno') {
    dataNascimento = String(formData.get('dataNascimento') ?? '').trim()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
      return { error: 'Indica a tua data de nascimento.' }
    }

    const idade = calcularIdade(dataNascimento)
    if (idade === null) {
      return { error: 'Essa data de nascimento não é válida.' }
    }
    if (idade < 0) {
      return { error: 'A data de nascimento não pode ser no futuro.' }
    }
    if (idade > 120) {
      return { error: 'Confirma a data de nascimento.' }
    }
  }

  let programa: string | null = null
  if (tipo === 'professor') {
    const codigoProfessor = String(formData.get('codigoProfessor') ?? '').trim()
    if (!codigoProfessor || codigoProfessor !== process.env.PROFESSOR_INVITE_CODE) {
      return { error: 'Código de professor inválido.' }
    }

    programa = String(formData.get('programa') ?? '')
    if (programa !== 'musica' && programa !== 'danca') {
      return { error: 'Escolhe a escola (Música ou Dança).' }
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome, tipo, programa, data_nascimento: dataNascimento, telefone },
    },
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

export async function pedirRecuperacaoPassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    return { error: 'Introduz o teu email.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origem()}/auth/confirm?next=/redefinir-password`,
  })

  if (error) {
    return { error: 'Não foi possível enviar o email. Tenta novamente.' }
  }

  return {
    info: 'Se existir uma conta com esse email, foi enviado um link para repores a password.',
  }
}

export async function atualizarPassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')

  if (password.length < 6) {
    return { error: 'A password deve ter pelo menos 6 caracteres.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'O link expirou. Pede um novo email de recuperação.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Não foi possível atualizar a password. Tenta novamente.' }
  }

  redirect('/dashboard')
}
