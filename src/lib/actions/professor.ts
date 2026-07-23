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
