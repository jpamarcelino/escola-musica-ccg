'use server'

import { createClient } from '@/lib/supabase/server'
import { calcularIdade } from '@/lib/idade'

// Variantes de login/signup/criarAlunoDependente que não fazem redirect —
// usadas pelo popup de conta em /pedir-aula, que precisa de ficar na mesma
// página (com os horários e a mensagem já escolhidos) em vez de saltar
// para /dashboard. A validação replica src/lib/actions/auth.ts e
// src/lib/actions/aluno.ts; qualquer alteração às regras aí devia
// refletir-se aqui também.

export type EstadoModal = { error?: string; sucesso?: true } | undefined

export async function loginModal(
  _prevState: EstadoModal,
  formData: FormData
): Promise<EstadoModal> {
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

  return { sucesso: true }
}

export async function registoModal(
  _prevState: EstadoModal,
  formData: FormData
): Promise<EstadoModal> {
  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const telefone = String(formData.get('telefone') ?? '').trim()
  const dataNascimento = String(formData.get('dataNascimento') ?? '').trim()

  if (!nome || !email || !password) {
    return { error: 'Preenche todos os campos.' }
  }
  if (password.length < 6) {
    return { error: 'A password deve ter pelo menos 6 caracteres.' }
  }
  if (telefone.replace(/[^0-9]/g, '').length < 9) {
    return { error: 'Indica um número de telemóvel válido.' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
    return { error: 'Indica a data de nascimento.' }
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

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome, data_nascimento: dataNascimento, telefone },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.session) {
    return {
      error: 'Conta criada! Verifica o teu email para confirmares a conta antes de continuares.',
    }
  }

  return { sucesso: true }
}

export type EstadoAlunoModal = { error?: string; alunoId?: string } | undefined

export async function criarAlunoDependenteModal(
  _prevState: EstadoAlunoModal,
  formData: FormData
): Promise<EstadoAlunoModal> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'A tua sessão expirou. Tenta entrar outra vez.' }
  }

  const nome = String(formData.get('nome') ?? '').trim()
  const dataNascimento = String(formData.get('dataNascimento') ?? '').trim()

  if (!nome) {
    return { error: 'Indica o nome do aluno.' }
  }
  if (dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
    return { error: 'Data de nascimento inválida.' }
  }

  const { data: aluno, error } = await supabase
    .from('alunos')
    .insert({
      encarregado_id: user.id,
      nome,
      data_nascimento: dataNascimento || null,
    })
    .select('id')
    .single()

  if (error || !aluno) {
    return { error: 'Não foi possível criar o perfil de aluno. Tenta novamente.' }
  }

  return { alunoId: aluno.id }
}

export async function listarMeusAlunos(): Promise<
  { id: string; nome: string }[]
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from('alunos')
    .select('id, nome')
    .eq('encarregado_id', user.id)
    .order('nome')

  return data ?? []
}
