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

  const alunoId = String(formData.get('alunoId') ?? '')
  const instrumentoId = String(formData.get('instrumentoId') ?? '')
  const professorId = String(formData.get('professorId') ?? '')
  const horarioIds = formData.getAll('horarios').map(String)
  const mensagem = String(formData.get('mensagem') ?? '').trim().slice(0, 500)

  function voltarComErro(mensagemErro: string): never {
    redirect(
      `/aluno/${alunoId}/pedido?instrumento=${instrumentoId}&professor=${professorId}&erro=${encodeURIComponent(mensagemErro)}`
    )
  }

  if (!alunoId || !instrumentoId || !professorId) {
    redirect('/dashboard')
  }
  // O aluno tem de escolher pelo menos um horário OU deixar uma mensagem —
  // nunca os dois em branco, mas qualquer um dos dois chega.
  if (horarioIds.length === 0 && !mensagem) {
    voltarComErro('Seleciona pelo menos um horário ou escreve uma mensagem.')
  }

  // Nunca confiar apenas no ecrã (que só esconde/desativa o cartão) — é
  // esta verificação, feita no servidor com a idade guardada na base de
  // dados, que impede de facto o pedido de disciplinas fora da idade do
  // aluno, mesmo que o pedido chegue diretamente a este endpoint. Também
  // confirma aqui que este aluno é mesmo gerido por quem está autenticado
  // (a RLS já impediria o insert, mas o erro fica mais claro assim).
  const [{ data: aluno }, { data: instrumentoPedido }] = await Promise.all([
    supabase
      .from('alunos')
      .select('data_nascimento')
      .eq('id', alunoId)
      .eq('encarregado_id', user.id)
      .maybeSingle(),
    supabase
      .from('instrumentos')
      .select('nome, programa')
      .eq('id', Number(instrumentoId))
      .single(),
  ])

  if (!aluno) {
    redirect('/dashboard')
  }

  if (
    !instrumentoPedido ||
    !elegivelParaDisciplina(
      calcularIdade(aluno.data_nascimento),
      instrumentoPedido.programa,
      instrumentoPedido.nome
    )
  ) {
    voltarComErro('Esta disciplina não está disponível para a idade do aluno.')
  }

  const { data: matriculaExistente } = await supabase
    .from('matriculas')
    .select('id')
    .eq('aluno_id', alunoId)
    .eq('instrumento_id', Number(instrumentoId))
    .in('estado', ['a_escolher', 'confirmado'])
    .maybeSingle()

  if (matriculaExistente) {
    voltarComErro('Já existe um pedido ou uma aula confirmada nesta disciplina.')
  }

  const { data: matricula, error: matriculaError } = await supabase
    .from('matriculas')
    .insert({
      aluno_id: alunoId,
      professor_id: professorId,
      instrumento_id: Number(instrumentoId),
      mensagem: mensagem || null,
    })
    .select('id')
    .single()

  if (matriculaError?.code === '23505') {
    voltarComErro('Já existe um pedido ou uma aula confirmada nesta disciplina.')
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
    .eq('estado', 'a_escolher')

  revalidatePath('/dashboard')
}

export async function cancelarMatricula(formData: FormData) {
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
    .eq('estado', 'confirmado')

  revalidatePath('/dashboard')
}

export async function criarAlunoDependente(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const nome = String(formData.get('nome') ?? '').trim()
  const dataNascimento = String(formData.get('dataNascimento') ?? '').trim()

  function voltarComErro(mensagem: string): never {
    redirect(`/dashboard?erro=${encodeURIComponent(mensagem)}`)
  }

  if (!nome) {
    voltarComErro('Indica o nome do aluno.')
  }
  if (dataNascimento && !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
    voltarComErro('Data de nascimento inválida.')
  }

  const { error } = await supabase.from('alunos').insert({
    encarregado_id: user.id,
    nome,
    data_nascimento: dataNascimento || null,
  })

  if (error) {
    voltarComErro('Não foi possível criar o perfil de aluno. Tenta novamente.')
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
