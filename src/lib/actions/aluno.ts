'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

  function voltarComErro(mensagem: string): never {
    redirect(
      `/aluno/pedido?instrumento=${instrumentoId}&professor=${professorId}&erro=${encodeURIComponent(mensagem)}`
    )
  }

  if (!instrumentoId || !professorId) {
    redirect('/aluno/pedido')
  }
  if (horarioIds.length === 0) {
    voltarComErro('Seleciona pelo menos um horário.')
  }

  const { data: matricula, error: matriculaError } = await supabase
    .from('matriculas')
    .insert({
      aluno_id: user.id,
      professor_id: professorId,
      instrumento_id: Number(instrumentoId),
    })
    .select('id')
    .single()

  if (matriculaError || !matricula) {
    voltarComErro('Não foi possível criar o pedido. Tenta novamente.')
  }

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
