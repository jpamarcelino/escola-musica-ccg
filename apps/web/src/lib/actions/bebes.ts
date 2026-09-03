'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// A Escola de Música para Bebés é gerida pela secretaria: o horário das
// turmas é da escola e não do professor, e as inscrições são aceites aqui
// e não na página de pedidos de quem dá a aula.
//
// Nenhuma destas acções verifica se quem chamou é da secretaria: quem o
// faz são as funções na base de dados, que levantam excepção a qualquer
// outra pessoa. Repetir a verificação aqui daria a impressão de que é
// esta a que conta.

function voltarComErro(caminho: string, mensagem: string): never {
  redirect(`${caminho}?erro=${encodeURIComponent(mensagem)}`)
}

export async function mudarHorarioTurmaBebes(formData: FormData) {
  const supabase = await createClient()
  const destino = '/admin/bebes/horarios'

  const turmaId = Number(formData.get('turmaId') ?? 0)
  const diaSemana = String(formData.get('diaSemana') ?? '').trim()
  const horaInicio = String(formData.get('horaInicio') ?? '').trim()
  const horaFim = String(formData.get('horaFim') ?? '').trim()

  if (!turmaId || !diaSemana || !horaInicio || !horaFim) {
    voltarComErro(destino, 'Escolhe o dia e as duas horas.')
  }

  const { error } = await supabase.rpc('mudar_horario_turma_bebes', {
    p_turma_id: turmaId,
    p_dia_semana: diaSemana,
    p_hora_inicio: horaInicio,
    p_hora_fim: horaFim,
  })

  if (error) voltarComErro(destino, error.message)

  // A hora mudou para toda a gente: a agenda do professor, a página da
  // escola e o painel de quem tem lá um filho.
  revalidatePath('/admin/bebes/horarios')
  revalidatePath('/dashboard/bebes')
  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard')
  redirect(`${destino}?guardado=${encodeURIComponent('Horário alterado. Os professores e as famílias foram avisados.')}`)
}

export async function atribuirProfessorTurmaBebes(formData: FormData) {
  const supabase = await createClient()
  const destino = '/admin/bebes/horarios'

  const turmaId = Number(formData.get('turmaId') ?? 0)
  const professorId = String(formData.get('professorId') ?? '').trim()

  if (!turmaId || !professorId) voltarComErro(destino, 'Escolhe um professor.')

  const { error } = await supabase
    .from('turmas_bebes_professores')
    .insert({ turma_id: turmaId, professor_id: professorId })

  if (error) {
    voltarComErro(
      destino,
      error.code === '23505' ? 'Esse professor já dá esta turma.' : error.message
    )
  }

  revalidatePath(destino)
  revalidatePath('/dashboard/bebes')
  redirect(`${destino}?guardado=${encodeURIComponent('Professor atribuído à turma.')}`)
}

export async function removerProfessorTurmaBebes(formData: FormData) {
  const supabase = await createClient()
  const destino = '/admin/bebes/horarios'

  const turmaId = Number(formData.get('turmaId') ?? 0)
  const professorId = String(formData.get('professorId') ?? '').trim()

  const { error } = await supabase
    .from('turmas_bebes_professores')
    .delete()
    .eq('turma_id', turmaId)
    .eq('professor_id', professorId)

  if (error) voltarComErro(destino, error.message)

  revalidatePath(destino)
  revalidatePath('/dashboard/bebes')
  redirect(`${destino}?guardado=${encodeURIComponent('Professor retirado da turma.')}`)
}

export async function aceitarPedidoBebes(formData: FormData) {
  const supabase = await createClient()
  const destino = '/admin/bebes/pedidos'

  const matriculaId = Number(formData.get('matriculaId') ?? 0)
  const professorId = String(formData.get('professorId') ?? '').trim()
  const valor = String(formData.get('valorMensal') ?? '').trim()

  if (!matriculaId || !professorId) voltarComErro(destino, 'Escolhe o professor da turma.')

  const { error } = await supabase.rpc('aceitar_pedido_bebes', {
    p_matricula_id: matriculaId,
    p_professor_id: professorId,
    p_valor_mensal: valor ? Number(valor.replace(',', '.')) : null,
  })

  if (error) voltarComErro(destino, error.message)

  revalidatePath(destino)
  revalidatePath('/admin/bebes/horarios')
  revalidatePath('/dashboard/bebes')
  revalidatePath('/dashboard/agenda')
  redirect(`${destino}?guardado=${encodeURIComponent('Inscrição aceite. A família foi avisada.')}`)
}

export async function recusarPedidoBebes(formData: FormData) {
  const supabase = await createClient()
  const destino = '/admin/bebes/pedidos'

  const matriculaId = Number(formData.get('matriculaId') ?? 0)
  const motivo = String(formData.get('motivo') ?? '').trim()

  const { error } = await supabase.rpc('recusar_pedido_bebes', {
    p_matricula_id: matriculaId,
    p_motivo: motivo || null,
  })

  if (error) voltarComErro(destino, error.message)

  revalidatePath(destino)
  redirect(`${destino}?guardado=${encodeURIComponent('Pedido recusado. A família foi avisada.')}`)
}

// Pedir inscrição numa turma de Bebés.
//
// Não passa pelo assistente normal — e não é um atalho, é outra coisa. Nas
// outras escolas escolhe-se o professor e as horas que dão jeito, e é o
// professor que responde. Aqui a turma é uma só, com hora fixa, e quem
// decide é a secretaria: não há nada para escolher a não ser dizer que se
// quer entrar.
//
// O `professor_id` da matrícula é um dos professores da turma, escolhido
// aqui só porque a coluna não aceita vazio. Quem fica mesmo com o aluno é
// decidido ao aceitar, na secretaria — e é lá que a coluna é reescrita.
export async function pedirInscricaoBebes(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const alunoId = String(formData.get('alunoId') ?? '')
  const instrumentoId = Number(formData.get('instrumentoId') ?? 0)
  const mensagem = String(formData.get('mensagem') ?? '').trim()

  const base = `/aluno/${alunoId}/pedido?programa=bebes&instrumento=${instrumentoId}`
  const erro = (m: string): never => redirect(`${base}&erro=${encodeURIComponent(m)}`)

  if (!alunoId || !instrumentoId) erro('Faltam dados do pedido.')

  const { data: turma } = await supabase
    .from('turmas_bebes')
    .select('id, capacidade')
    .eq('instrumento_id', instrumentoId)
    .maybeSingle()

  if (!turma) erro('Essa turma não existe.')

  const { data: profs } = await supabase
    .from('turmas_bebes_professores')
    .select('professor_id')
    .eq('turma_id', turma!.id)

  if (!profs || profs.length === 0) {
    erro('Esta turma ainda não tem professor. Fala com a secretaria.')
  }

  // A lotação é dita aqui para não se pedir um lugar que não existe. Quem
  // a garante é a base de dados, ao aceitar.
  const { data: ocupacao } = await supabase.rpc('ocupacao_turma_bebes', {
    p_turma_id: turma!.id,
  })
  if (Number(ocupacao ?? 0) >= turma!.capacidade) {
    erro('Esta turma está cheia. Fala com a secretaria para entrares em lista de espera.')
  }

  const { error } = await supabase.from('matriculas').insert({
    aluno_id: alunoId,
    professor_id: profs![0].professor_id,
    instrumento_id: instrumentoId,
    mensagem: mensagem || null,
  })

  if (error) {
    erro(
      error.code === '23505'
        ? 'Já existe um pedido ou uma inscrição nesta turma.'
        : 'Não foi possível criar o pedido. Tenta novamente.'
    )
  }

  revalidatePath('/admin/bebes/pedidos')
  revalidatePath(`/aluno/${alunoId}`)
  redirect(`/aluno/${alunoId}?pedido=bebes`)
}
