'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type AlunoParaRecomendacao = {
  id: string
  nome: string
  encarregado_id: string
}

async function exigirAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  return { supabase, user }
}

function erroAoRegistar(mensagem: string): never {
  redirect('/admin/recomendacoes/nova?erro=' + encodeURIComponent(mensagem))
}

// Art. 11.º — as condições que têm de estar cumulativamente cumpridas
// para uma recomendação poder existir. Corre no registo (e não só na
// validação) porque o Art. 10.º, n.º 5 proíbe reconhecer recomendações
// retroativamente: mais vale a secretaria descobrir o problema à frente
// da pessoa que está a inscrever-se do que semanas depois.
export async function registarRecomendacao(formData: FormData) {
  const { supabase, user } = await exigirAdmin()

  const professorId = String(formData.get('professorId') ?? '')
  const recomendadorId = String(formData.get('recomendadorId') ?? '')
  const novoAlunoId = String(formData.get('novoAlunoId') ?? '')
  const novoAlunoNomeLivre = String(formData.get('novoAlunoNomeLivre') ?? '').trim()
  const modalidade = String(formData.get('modalidade') ?? '').trim() || null
  const dataInscricao = String(formData.get('dataInscricao') ?? '') || null
  const dataPrimeiroPagamento = String(formData.get('dataPrimeiroPagamento') ?? '') || null
  const observacoes = String(formData.get('observacoes') ?? '').trim() || null
  const validarJa = String(formData.get('validarJa') ?? '') === 'on'
  const valorInscricaoTexto = String(formData.get('valorInscricao') ?? '').trim().replace(',', '.')
  const valorInscricao = valorInscricaoTexto === '' ? null : Number(valorInscricaoTexto)

  if (valorInscricao !== null && (Number.isNaN(valorInscricao) || valorInscricao < 0)) {
    erroAoRegistar('Valor de inscrição inválido.')
  }

  if (!professorId || !recomendadorId) {
    erroAoRegistar('Escolhe o professor e o aluno que recomendou.')
  }

  if (!novoAlunoId && !novoAlunoNomeLivre) {
    erroAoRegistar('Indica o novo aluno — escolhe-o da lista ou escreve o nome.')
  }

  // e) o professor participa no Programa.
  const { data: professorPerfilData } = await supabase
    .from('perfis_escola')
    .select('adere_recomendacao, profiles(nome)')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  const professorPerfil = professorPerfilData as unknown as {
    adere_recomendacao: boolean
    profiles: { nome: string } | null
  } | null

  if (!professorPerfil) {
    erroAoRegistar('Professor não encontrado.')
  }

  if (!professorPerfil.adere_recomendacao) {
    erroAoRegistar(
      'Esse professor não aderiu ao Programa — não pode suportar o benefício (Art. 5.º).'
    )
  }

  const idsAProcurar = novoAlunoId ? [recomendadorId, novoAlunoId] : [recomendadorId]
  const { data: alunosData } = await supabase
    .from('alunos')
    .select('id, nome, encarregado_id')
    .in('id', idsAProcurar)
  const alunos = (alunosData ?? []) as AlunoParaRecomendacao[]

  const recomendador = alunos.find((a) => a.id === recomendadorId)
  const novoAluno = novoAlunoId ? alunos.find((a) => a.id === novoAlunoId) : null

  if (!recomendador) {
    erroAoRegistar('Aluno recomendador não encontrado.')
  }

  if (novoAlunoId && !novoAluno) {
    erroAoRegistar('Novo aluno não encontrado.')
  }

  if (novoAlunoId && novoAlunoId === recomendadorId) {
    erroAoRegistar('Um aluno não pode recomendar-se a si próprio.')
  }

  // Art. 9.º: mesmo agregado familiar não conta — nesses casos aplica-se
  // o desconto de família, que é outro regime. Aqui "agregado" é
  // aproximado pelo encarregado de educação, que é o que a app conhece.
  if (novoAluno && novoAluno.encarregado_id === recomendador.encarregado_id) {
    erroAoRegistar(
      'Os dois alunos estão na mesma conta de encarregado de educação. ' +
        'O Art. 9.º exclui o mesmo agregado familiar — aplica-se o desconto de família.'
    )
  }

  // c) recomendador e novo aluno pertencem ao mesmo professor (Art. 8.º).
  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('aluno_id, estado, instrumentos(nome)')
    .eq('professor_id', professorId)
    .in('aluno_id', idsAProcurar)

  const matriculas = (matriculasData ?? []) as unknown as {
    aluno_id: string
    estado: string
    instrumentos: { nome: string } | null
  }[]

  const recomendadorTemMatricula = matriculas.some(
    (m) => m.aluno_id === recomendadorId && m.estado === 'confirmado'
  )

  if (!recomendadorTemMatricula) {
    erroAoRegistar(
      `${recomendador.nome} não tem matrícula confirmada com este professor. ` +
        'O Art. 8.º só admite recomendações dentro do mesmo professor.'
    )
  }

  if (novoAlunoId) {
    const novoTemMatricula = matriculas.some((m) => m.aluno_id === novoAlunoId)
    if (!novoTemMatricula) {
      erroAoRegistar(
        `${novoAluno?.nome} não tem nenhuma matrícula com este professor. ` +
          'O benefício tem de ser suportado pelo professor que recebe o novo aluno.'
      )
    }

    // Art. 10.º, n.º 3: cada novo aluno só pode indicar um recomendador.
    // A base de dados também garante isto, mas apanhado aqui dá uma
    // mensagem que se percebe em vez de um erro de constraint.
    const { count: jaRecomendado } = await supabase
      .from('recomendacoes')
      .select('id', { count: 'exact', head: true })
      .eq('novo_aluno_id', novoAlunoId)
      .neq('estado', 'anulada')

    if ((jaRecomendado ?? 0) > 0) {
      erroAoRegistar(
        `${novoAluno?.nome} já foi registado como recomendado por outra pessoa. ` +
          'Cada novo aluno só pode indicar um recomendador.'
      )
    }
  }

  // Sem escolha explícita, herda a modalidade da matrícula do novo aluno
  // com este professor — é o dado que o Art. 20.º pede e evita ter de o
  // escrever à mão no caso normal.
  const modalidadeFinal =
    modalidade ??
    matriculas.find((m) => m.aluno_id === novoAlunoId)?.instrumentos?.nome ??
    null

  const podeValidar = validarJa && dataInscricao !== null && dataPrimeiroPagamento !== null

  if (validarJa && !podeValidar) {
    erroAoRegistar(
      'Para validar já é preciso a data de inscrição e a data do primeiro pagamento (Art. 11.º).'
    )
  }

  const { data: novaRecomendacao, error: erroInsert } = await supabase
    .from('recomendacoes')
    .insert({
      recomendador_id: recomendadorId,
      recomendador_nome: recomendador.nome,
      novo_aluno_id: novoAlunoId || null,
      novo_aluno_nome: novoAluno?.nome ?? novoAlunoNomeLivre,
      professor_id: professorId,
      professor_nome: professorPerfil.profiles?.nome ?? '',
      modalidade: modalidadeFinal,
      data_inscricao: dataInscricao,
      data_primeiro_pagamento: dataPrimeiroPagamento,
      valor_inscricao: valorInscricao,
      data_validacao: podeValidar ? new Date().toISOString().slice(0, 10) : null,
      estado: podeValidar ? 'validada' : 'registada',
      observacoes,
      registado_por: user.id,
    })
    .select('id')
    .single()

  if (erroInsert || !novaRecomendacao) {
    erroAoRegistar('Não foi possível registar a recomendação. ' + (erroInsert?.message ?? ''))
  }

  if (podeValidar) {
    await criarBeneficio(supabase, {
      recomendacaoId: novaRecomendacao.id,
      alunoId: recomendadorId,
      alunoNome: recomendador.nome,
      professorId,
    })
  }

  revalidatePath('/admin/recomendacoes')
  redirect(`/admin/recomendacoes/${novaRecomendacao.id}`)
}

type SupabaseServidor = Awaited<ReturnType<typeof createClient>>

async function criarBeneficio(
  supabase: SupabaseServidor,
  dados: { recomendacaoId: number; alunoId: string; alunoNome: string; professorId: string }
) {
  await supabase.from('beneficios').insert({
    recomendacao_id: dados.recomendacaoId,
    aluno_id: dados.alunoId,
    aluno_nome: dados.alunoNome,
    professor_id: dados.professorId,
  })
}

// Art. 11.º, n.º 2: só depois da validação é que o benefício existe. O
// mês em que será usado não se escolhe aqui — quem o atribui é a geração
// automática do dia 1 (Art. 13.º).
export async function validarRecomendacao(formData: FormData) {
  const { supabase } = await exigirAdmin()

  const id = Number(formData.get('id') ?? 0)
  const destino = `/admin/recomendacoes/${id}`

  const { data: recomendacao } = await supabase
    .from('recomendacoes')
    .select('id, estado, recomendador_id, recomendador_nome, professor_id, data_inscricao, data_primeiro_pagamento')
    .eq('id', id)
    .maybeSingle()

  if (!recomendacao) {
    redirect('/admin/recomendacoes?erro=' + encodeURIComponent('Recomendação não encontrada.'))
  }

  if (recomendacao.estado !== 'registada') {
    redirect(
      destino + '?erro=' + encodeURIComponent('Esta recomendação já não está por validar.')
    )
  }

  if (!recomendacao.data_inscricao || !recomendacao.data_primeiro_pagamento) {
    redirect(
      destino +
        '?erro=' +
        encodeURIComponent(
          'Preenche primeiro a data de inscrição e a do primeiro pagamento — ' +
            'o Art. 11.º só valida depois de ambos confirmados.'
        )
    )
  }

  await supabase
    .from('recomendacoes')
    .update({
      estado: 'validada',
      data_validacao: new Date().toISOString().slice(0, 10),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)

  await criarBeneficio(supabase, {
    recomendacaoId: recomendacao.id,
    alunoId: recomendacao.recomendador_id,
    alunoNome: recomendacao.recomendador_nome,
    professorId: recomendacao.professor_id,
  })

  revalidatePath('/admin/recomendacoes')
  revalidatePath(destino)
  redirect(destino)
}

// Cobre o Art. 17.º (professor sai), o 23.º (erro administrativo) e o
// 24.º (utilização abusiva). Um benefício já usado não se desfaz — a
// mensalidade desse mês já foi dada como não devida e o Art. 33.º, n.º 3
// protege benefícios já usufruídos.
export async function anularRecomendacao(formData: FormData) {
  const { supabase } = await exigirAdmin()

  const id = Number(formData.get('id') ?? 0)
  const motivo = String(formData.get('motivo') ?? '').trim()
  const destino = `/admin/recomendacoes/${id}`

  if (!motivo) {
    redirect(destino + '?erro=' + encodeURIComponent('Escreve o motivo da anulação.'))
  }

  await supabase
    .from('recomendacoes')
    .update({
      estado: 'anulada',
      motivo_anulacao: motivo,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)

  await supabase
    .from('beneficios')
    .update({
      estado: 'anulado',
      motivo_anulacao: motivo,
      atualizado_em: new Date().toISOString(),
    })
    .eq('recomendacao_id', id)
    .eq('estado', 'pendente')

  revalidatePath('/admin/recomendacoes')
  revalidatePath(destino)
  redirect(destino)
}

// Correção de dados administrativos (Art. 23.º). Não mexe no estado nem
// no benefício — para isso há validar/anular.
export async function atualizarDadosRecomendacao(formData: FormData) {
  const { supabase } = await exigirAdmin()

  const id = Number(formData.get('id') ?? 0)
  const dataInscricao = String(formData.get('dataInscricao') ?? '') || null
  const dataPrimeiroPagamento = String(formData.get('dataPrimeiroPagamento') ?? '') || null
  const modalidade = String(formData.get('modalidade') ?? '').trim() || null
  const observacoes = String(formData.get('observacoes') ?? '').trim() || null
  const valorInscricaoTexto = String(formData.get('valorInscricao') ?? '').trim().replace(',', '.')
  const valorInscricao =
    valorInscricaoTexto === '' || Number.isNaN(Number(valorInscricaoTexto))
      ? null
      : Number(valorInscricaoTexto)

  await supabase
    .from('recomendacoes')
    .update({
      data_inscricao: dataInscricao,
      data_primeiro_pagamento: dataPrimeiroPagamento,
      valor_inscricao: valorInscricao,
      modalidade,
      observacoes,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath(`/admin/recomendacoes/${id}`)
  redirect(`/admin/recomendacoes/${id}`)
}

export async function definirAdesaoRecomendacao(formData: FormData) {
  const { supabase } = await exigirAdmin()

  const professorId = String(formData.get('professorId') ?? '')
  const adere = String(formData.get('adere') ?? '') === 'true'

  await supabase.rpc('definir_adesao_recomendacao', {
    professor_id_param: professorId,
    adere_param: adere,
  })

  revalidatePath(`/admin/professores/${professorId}`)
  revalidatePath('/admin/recomendacoes')
}
