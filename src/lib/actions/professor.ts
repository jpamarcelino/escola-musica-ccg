'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function confirmarHorario(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = String(formData.get('matriculaId') ?? '')
  const horarioId = String(formData.get('horarioId') ?? '')

  await supabase
    .from('matriculas')
    .update({ horario_final_id: Number(horarioId), estado: 'confirmado' })
    .eq('id', matriculaId)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard')
}

export async function alternarEstadoHorario(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const horarioId = String(formData.get('horarioId') ?? '')
  const novoEstado = String(formData.get('novoEstado') ?? '')

  await supabase
    .from('horarios')
    .update({ estado: novoEstado })
    .eq('id', horarioId)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard')
}

export async function atualizarInstrumentos(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const instrumentoIds = formData.getAll('instrumentos').map(String)

  await supabase.from('professor_instrumentos').delete().eq('professor_id', user.id)

  if (instrumentoIds.length > 0) {
    await supabase.from('professor_instrumentos').insert(
      instrumentoIds.map((id) => ({
        professor_id: user.id,
        instrumento_id: Number(id),
      }))
    )
  }

  revalidatePath('/dashboard')
}

function gerarBlocos(horaInicio: string, horaFim: string, duracaoMinutos: number) {
  const paraMinutos = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const paraHHMM = (minutos: number) => {
    const h = Math.floor(minutos / 60).toString().padStart(2, '0')
    const m = (minutos % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  }

  const inicio = paraMinutos(horaInicio)
  const fim = paraMinutos(horaFim)
  const blocos: { inicio: string; fim: string }[] = []

  for (let t = inicio; t + duracaoMinutos <= fim; t += duracaoMinutos) {
    blocos.push({ inicio: paraHHMM(t), fim: paraHHMM(t + duracaoMinutos) })
  }

  return blocos
}

export async function criarHorarios(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const instrumentoId = String(formData.get('instrumentoId') ?? '')
  const dias = formData.getAll('dias').map(String)
  const horaInicio = String(formData.get('horaInicio') ?? '')
  const horaFim = String(formData.get('horaFim') ?? '')
  const duracaoMinutos = Number(formData.get('duracaoMinutos') ?? 0)

  function voltarComErro(mensagem: string): never {
    redirect(`/dashboard?erroHorarios=${encodeURIComponent(mensagem)}`)
  }

  if (!instrumentoId || dias.length === 0 || !horaInicio || !horaFim || !duracaoMinutos) {
    voltarComErro('Preenche todos os campos.')
  }

  const blocos = gerarBlocos(horaInicio, horaFim, duracaoMinutos)
  if (blocos.length === 0) {
    voltarComErro('Esse intervalo não cabe nenhuma aula com essa duração.')
  }

  const linhas = dias.flatMap((dia) =>
    blocos.map((b) => ({
      professor_id: user.id,
      instrumento_id: Number(instrumentoId),
      dia_semana: dia,
      hora_inicio: b.inicio,
      hora_fim: b.fim,
      estado: 'aberto',
    }))
  )

  const { error } = await supabase.from('horarios').insert(linhas)

  if (error) {
    voltarComErro('Não foi possível criar os horários. Tenta novamente.')
  }

  revalidatePath('/dashboard')
}

export async function atualizarHorario(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const horarioId = String(formData.get('horarioId') ?? '')
  const instrumentoId = String(formData.get('instrumentoId') ?? '')
  const diaSemana = String(formData.get('diaSemana') ?? '')
  const horaInicio = String(formData.get('horaInicio') ?? '')
  const horaFim = String(formData.get('horaFim') ?? '')

  function voltarComErro(mensagem: string): never {
    redirect(
      `/professor/horarios/${horarioId}?erro=${encodeURIComponent(mensagem)}`
    )
  }

  if (!instrumentoId || !diaSemana || !horaInicio || !horaFim) {
    voltarComErro('Preenche todos os campos.')
  }
  if (horaFim <= horaInicio) {
    voltarComErro('A hora de fim tem de ser depois da hora de início.')
  }

  const { error } = await supabase
    .from('horarios')
    .update({
      instrumento_id: Number(instrumentoId),
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
    })
    .eq('id', horarioId)
    .eq('professor_id', user.id)

  if (error) {
    voltarComErro('Não foi possível guardar as alterações. Tenta novamente.')
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function apagarHorario(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const horarioId = String(formData.get('horarioId') ?? '')

  const { error } = await supabase
    .from('horarios')
    .delete()
    .eq('id', horarioId)
    .eq('professor_id', user.id)

  if (error) {
    const mensagem = error.code === '23503'
      ? 'Não é possível apagar: já tens alunos confirmados neste horário. Bloqueia-o em vez disso.'
      : 'Não foi possível apagar o horário. Tenta novamente.'
    redirect(
      `/professor/horarios/${horarioId}?erro=${encodeURIComponent(mensagem)}`
    )
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
