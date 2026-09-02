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
