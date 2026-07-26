'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { calcularIdade } from '@/lib/idade'
import { elegivelParaDisciplina } from '@/lib/idade-disciplinas'

export async function escolherDisponibilidades(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const instrumentoId = String(formData.get('instrumentoId') ?? '')
  const professorId = String(formData.get('professorId') ?? '')
  const horarioIds = formData.getAll('horarios').map(String)
  const mensagem = String(formData.get('mensagem') ?? '').trim().slice(0, 500)

  function voltarComErro(mensagemErro: string): never {
    redirect(
      `/aluno/pedido?instrumento=${instrumentoId}&professor=${professorId}&erro=${encodeURIComponent(mensagemErro)}`
    )
  }

  if (!instrumentoId || !professorId) {
    redirect('/aluno/pedido')
  }
  // O aluno tem de escolher pelo menos um horário OU deixar uma mensagem —
  // nunca os dois em branco, mas qualquer um dos dois chega.
  if (horarioIds.length === 0 && !mensagem) {
    voltarComErro('Seleciona pelo menos um horário ou escreve uma mensagem.')
  }

  // Nunca confiar apenas no ecrã (que só esconde/desativa o cartão) — é
  // esta verificação, feita no servidor com a idade guardada na base de
  // dados, que impede de facto o pedido de disciplinas fora da idade do
  // aluno, mesmo que o pedido chegue diretamente a este endpoint.
  const [{ data: perfilAluno }, { data: instrumentoPedido }] = await Promise.all([
    supabase.from('profiles').select('data_nascimento').eq('id', user.id).single(),
    supabase
      .from('instrumentos')
      .select('nome, programa')
      .eq('id', Number(instrumentoId))
      .single(),
  ])

  if (
    !instrumentoPedido ||
    !elegivelParaDisciplina(
      calcularIdade(perfilAluno?.data_nascimento),
      instrumentoPedido.programa,
      instrumentoPedido.nome
    )
  ) {
    voltarComErro('Esta disciplina não está disponível para a tua idade.')
  }

  const { data: matriculaExistente } = await supabase
    .from('matriculas')
    .select('id')
    .eq('aluno_id', user.id)
    .eq('instrumento_id', Number(instrumentoId))
    .in('estado', ['a_escolher', 'confirmado'])
    .maybeSingle()

  if (matriculaExistente) {
    voltarComErro('Já tens um pedido ou uma aula confirmada nesta disciplina.')
  }

  const { data: matricula, error: matriculaError } = await supabase
    .from('matriculas')
    .insert({
      aluno_id: user.id,
      professor_id: professorId,
      instrumento_id: Number(instrumentoId),
      mensagem: mensagem || null,
    })
    .select('id')
    .single()

  if (matriculaError?.code === '23505') {
    voltarComErro('Já tens um pedido ou uma aula confirmada nesta disciplina.')
  }

  if (matriculaError || !matricula) {
    voltarComErro('Não foi possível criar o pedido. Tenta novamente.')
  }

  // Só há disponibilidades a guardar se o aluno tiver marcado algum horário
  // — um pedido só com mensagem não tem nenhuma.
  if (horarioIds.length > 0) {
    const { error: disponibilidadesError } = await supabase
      .from('disponibilidades_selecionadas')
      .insert(
        horarioIds.map((horarioId) => ({
          matricula_id: matricula.id,
          horario_id: Number(horarioId),
        }))
      )

    if (disponibilidadesError) {
      voltarComErro('Não foi possível guardar as disponibilidades. Tenta novamente.')
    }
  }

  redirect('/dashboard')
}

export async function cancelarPedido(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = String(formData.get('matriculaId') ?? '')

  await supabase
    .from('matriculas')
    .delete()
    .eq('id', matriculaId)
    .eq('aluno_id', user.id)
    .eq('estado', 'a_escolher')

  revalidatePath('/dashboard')
}
