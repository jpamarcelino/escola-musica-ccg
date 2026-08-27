'use server'

import { createClient } from '@/lib/supabase/server'
import { TEXTOS_LEGAIS, validarDataNascimento, validarRegisto } from '@ccg/core'
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

  const dataNascimento = String(formData.get('dataNascimento') ?? '').trim()
  const ehProprio = formData.get('ehProprio') === 'sim'

  // Mesma regra da página /dashboard/alunos: quem é ele próprio o aluno
  // não reescreve o nome — vem da conta, e da base e não de um campo
  // escondido, que se podia reescrever.
  let nome: string
  if (ehProprio) {
    const { data: perfil } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single()
    nome = (perfil?.nome ?? '').trim()
    if (!nome) {
      return { error: 'A tua conta não tem nome. Preenche-o em Conta e tenta outra vez.' }
    }

    const { data: jaExiste } = await supabase
      .from('alunos')
      .select('id')
      .eq('propria_conta_id', user.id)
      .maybeSingle()

    if (jaExiste) {
      return { error: 'Já tens um perfil de aluno em teu nome. Escolhe-o na lista acima.' }
    }
  } else {
    nome = String(formData.get('nome') ?? '').trim()
    if (!nome) {
      return { error: 'Indica o nome do aluno.' }
    }
    // Criar um perfil para outra pessoa exige a declaração; criar o
    // próprio não, que não há legitimidade a declarar sobre si mesmo.
    // O `required` do markup não chega — é o formulário a pedir, e um
    // formulário pede-se sem passar por ele.
    if (formData.get('declaraLegitimidade') !== 'on') {
      return { error: TEXTOS_LEGAIS.erroDeclaracaoPerfilAluno }
    }
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
      // Nunca vem do formulário: é sempre a conta autenticada, senão dava
      // para reclamar como "próprio" o perfil de outra pessoa.
      propria_conta_id: ehProprio ? user.id : null,
      nome,
      data_nascimento: dataNascimento || null,
      // A prova da declaração, e não só a sua exigência: uma caixa
      // marcada que não deixa rasto não prova nada. Ver migração 0055.
      declaracao_legitimidade_em: ehProprio ? null : new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !aluno) {
    return { error: 'Não foi possível criar o perfil de aluno. Tenta novamente.' }
  }

  return { alunoId: aluno.id }
}

// O que o pop-up precisa de saber antes de mostrar as opções: como se
// chama quem está autenticado, e se já existe um perfil de aluno em nome
// dele (nesse caso "sou eu" não faz sentido — está na lista).
export async function dadosDoTitular(): Promise<{ nome: string; jaTemProprio: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { nome: '', jaTemProprio: false }

  const [{ data: perfil }, { data: proprio }] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', user.id).single(),
    supabase.from('alunos').select('id').eq('propria_conta_id', user.id).maybeSingle(),
  ])

  return { nome: perfil?.nome ?? '', jaTemProprio: !!proprio }
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
