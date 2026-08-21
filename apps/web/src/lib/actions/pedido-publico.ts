'use server'

import { createClient } from '@/lib/supabase/server'
import { validarDataNascimento, validarRegisto } from '@ccg/core'
import { listarAlunosDoEncarregado, type AlunoResumo } from '@ccg/data'

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
  const aceitaTermos = formData.get('aceitaTermos') === 'on'
  const declaraMaioridade = formData.get('declaraMaioridade') === 'on'

  // Mesmas regras do registo em auth.ts — literalmente as mesmas.
  const erro = validarRegisto({
    nome,
    email,
    password,
    telefone,
    aceitaTermos,
    declaraMaioridade,
  })
  if (erro) {
    return { error: erro }
  }

  const supabase = await createClient()

  const { data: docTermos } = await supabase
    .from('documentos_legais')
    .select('versao')
    .eq('tipo', 'termos')
    .eq('ativo', true)
    .maybeSingle()

  if (!docTermos?.versao) {
    return { error: 'Não é possível criar conta neste momento. Contacta a secretaria.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // A versão vem da base, nunca do formulário. Ver auth.ts.
      data: { nome, telefone, termos_versao: docTermos.versao },
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
  // A data continua opcional aqui — quem cria um aluno pelo pop-up pode
  // não a saber de cor. Mas quando a escreve, passa a valer a mesma regra
  // de toda a app: antes só se verificava o formato, e uma criança nascida
  // em 2050 entrava sem uma queixa.
  if (dataNascimento) {
    const erroData = validarDataNascimento(dataNascimento, 'aluno')
    if (erroData) {
      return { error: erroData }
    }
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

// A query em si vive no @ccg/data, para a app móvel a usar tal e qual.
// O que fica aqui é só o que é da web: ser uma Server Action e ir buscar
// a sessão aos cookies.
export async function listarMeusAlunos(): Promise<AlunoResumo[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  return listarAlunosDoEncarregado(supabase, user.id)
}
