'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { diaSemanaDaData, dataEhFutura } from '@/lib/datas'

const ESTADOS_VALIDOS = ['presente', 'falta_aviso', 'falta_sem_aviso']

export async function marcarPresencas(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const horarioId = String(formData.get('horarioId') ?? '')
  const data = String(formData.get('data') ?? '')

  function voltarComErro(mensagem: string): never {
    redirect(
      `/dashboard/presencas/${horarioId}?data=${encodeURIComponent(data)}&erro=${encodeURIComponent(mensagem)}`
    )
  }

  const { data: horario } = await supabase
    .from('horarios')
    .select('dia_semana')
    .eq('id', horarioId)
    .eq('professor_id', user.id)
    .maybeSingle()

  if (!horario) {
    voltarComErro('Horário não encontrado.')
  }
  if (dataEhFutura(data)) {
    voltarComErro('Não é possível marcar presenças para uma data futura.')
  }
  if (diaSemanaDaData(data) !== horario.dia_semana) {
    voltarComErro(`Essa data não é uma ${horario.dia_semana}, o dia deste horário.`)
  }

  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('id')
    .eq('horario_final_id', horarioId)
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
  const idsValidos = new Set((matriculas ?? []).map((m) => m.id))

  const linhas: {
    matricula_id: number
    data: string
    estado: string
    marcado_por: string
    atualizado_em: string
  }[] = []

  for (const matriculaId of idsValidos) {
    const estado = String(formData.get(`estado_${matriculaId}`) ?? '')
    if (!ESTADOS_VALIDOS.includes(estado)) continue
    linhas.push({
      matricula_id: matriculaId,
      data,
      estado,
      marcado_por: user.id,
      atualizado_em: new Date().toISOString(),
    })
  }

  if (linhas.length === 0) {
    voltarComErro('Marca pelo menos um aluno.')
  }

  const { error } = await supabase
    .from('presencas')
    .upsert(linhas, { onConflict: 'matricula_id,data' })

  if (error) {
    voltarComErro('Não foi possível guardar as presenças. Tenta novamente.')
  }

  revalidatePath(`/dashboard/presencas/${horarioId}`)
  revalidatePath('/dashboard/presencas')
  revalidatePath('/dashboard/presencas/confirmar')
  revalidatePath('/dashboard/presencas/historico')
  redirect('/dashboard/presencas/confirmar?guardado=1')
}
