'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { diaSemanaDaData, dataEhFutura } from '@ccg/core'
import { PRESENCAESTADO_VALORES, type PresencaEstado } from '@ccg/types'

// O estado chega do formulário, portanto de fora — tem mesmo de ser
// validado aqui. O que mudou é a lista deixar de ser uma cópia à mão da
// constraint da tabela (que podia ficar para trás numa migração) e passar
// a ser a própria constraint, lida do esquema.
//
// Devolver um type predicate faz a verificação de execução e a do
// compilador serem a mesma coisa: depois deste `if`, o TypeScript já sabe
// que o valor é um PresencaEstado, e a linha vai para o upsert sem cast.
function ehEstadoValido(valor: string): valor is PresencaEstado {
  return (PRESENCAESTADO_VALORES as readonly string[]).includes(valor)
}

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
    .select('id, aluno_id, instrumentos(nome)')
    .eq('horario_final_id', horarioId)
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
  type MatriculaComInstrumento = {
    id: number
    aluno_id: string
    instrumentos: { nome: string } | null
  }
  const matriculasValidas = (matriculas ?? []) as unknown as MatriculaComInstrumento[]

  const linhas: {
    matricula_id: number
    aluno_id: string
    professor_id: string
    instrumento_nome: string | null
    data: string
    estado: PresencaEstado
    marcado_por: string
    atualizado_em: string
  }[] = []

  for (const matricula of matriculasValidas) {
    const estado = String(formData.get(`estado_${matricula.id}`) ?? '')
    if (!ehEstadoValido(estado)) continue
    linhas.push({
      matricula_id: matricula.id,
      aluno_id: matricula.aluno_id,
      professor_id: user.id,
      instrumento_nome: matricula.instrumentos?.nome ?? null,
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
