'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
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

  if (
    !nome ||
    !email ||
    !password ||
    (tipo !== 'aluno' && tipo !== 'professor' && tipo !== 'admin')
  ) {
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

  if (tipo === 'admin') {
    const codigoAdmin = String(formData.get('codigoAdmin') ?? '').trim()
    if (!codigoAdmin || codigoAdmin !== process.env.ADMIN_INVITE_CODE) {
      return { error: 'Código de admin inválido.' }
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

export async function atualizarNomeConta(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const nome = String(formData.get('nome') ?? '').trim()

  if (!nome) {
    return { error: 'O nome não pode ficar vazio.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.from('profiles').update({ nome }).eq('id', user.id)

  if (error) {
    return { error: 'Não foi possível atualizar o nome. Tenta novamente.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/conta')
  revalidatePath('/admin')
  revalidatePath('/admin/conta')

  return { info: 'Nome atualizado.' }
}

export async function atualizarEmailConta(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    return { error: 'Indica o novo email.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('tipo')
    .eq('id', user.id)
    .single()

  // Só alunos podem mudar o próprio email por aqui — professores e admins
  // pedem à direção, para já.
  if (perfil?.tipo !== 'aluno') {
    return { error: 'Não tens permissão para alterar o email.' }
  }

  const { error } = await supabase.auth.updateUser({ email })

  if (error) {
    return { error: 'Não foi possível atualizar o email. Tenta novamente.' }
  }

  // Não atualizamos profiles.email já aqui: o Supabase só troca o email de
  // autenticação depois de confirmado por link (enviado para o email
  // antigo e/ou novo, consoante a configuração do projeto) — escrever já
  // o valor novo deixava profiles.email a mostrar um email que ainda não
  // dá para usar no login, uma mentira até à confirmação (ou para sempre,
  // se nunca for confirmado).
  return {
    info: 'Enviámos um link de confirmação para o novo email. O email só muda depois de confirmares.',
  }
}

export async function atualizarPasswordConta(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const passwordAtual = String(formData.get('passwordAtual') ?? '')
  const passwordNova = String(formData.get('passwordNova') ?? '')
  const passwordNovaRepetir = String(formData.get('passwordNovaRepetir') ?? '')

  if (!passwordAtual || !passwordNova || !passwordNovaRepetir) {
    return { error: 'Preenche todos os campos.' }
  }
  if (passwordNova.length < 6) {
    return { error: 'A nova password deve ter pelo menos 6 caracteres.' }
  }
  if (passwordNova !== passwordNovaRepetir) {
    return { error: 'As passwords novas não coincidem.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  // Confirma a password atual voltando a autenticar antes de a trocar —
  // evita que alguém com uma sessão aberta (ex: telemóvel destrancado)
  // mude a password sem a saber.
  const { error: erroAtual } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: passwordAtual,
  })

  if (erroAtual) {
    return { error: 'A password atual está incorreta.' }
  }

  const { error } = await supabase.auth.updateUser({ password: passwordNova })

  if (error) {
    return { error: 'Não foi possível atualizar a password. Tenta novamente.' }
  }

  return { info: 'Password atualizada.' }
}

export async function apagarConta() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tipo')
    .eq('id', user.id)
    .single()
  const contaHref = profile?.tipo === 'admin' ? '/admin/conta' : '/dashboard/conta'

  // Apaga a conta através de uma função da BD (a app só tem a anon key,
  // que não pode apagar de auth.users diretamente). Isto cascateia até
  // profiles, matrículas, disponibilidades e horários — o histórico de
  // presenças e mensalidades fica guardado (ver migrações 0008 e 0013).
  const { error } = await supabase.rpc('apagar_propria_conta')

  if (error) {
    redirect(`${contaHref}?erro=${encodeURIComponent('Não foi possível apagar a conta. Tenta novamente.')}`)
  }

  await supabase.auth.signOut()
  redirect('/login')
}
