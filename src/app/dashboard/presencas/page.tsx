import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { datasDoDia, INICIO_PRESENCAS, hojeISO } from '@/lib/datas'
import { BackButton } from '@/components/back-button'
import { OptionCard } from '@/components/option-card'

type Horario = {
  id: number
  dia_semana: string
}

type MatriculaConfirmada = {
  id: number
  horario_final_id: number
}

export default async function PresencasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('perfis_escola')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: horariosData } = await supabase
    .from('horarios')
    .select('id, dia_semana')
    .eq('professor_id', user.id)
  const horarios = (horariosData ?? []) as unknown as Horario[]

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('id, horario_final_id')
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .not('horario_final_id', 'is', null)
  const matriculas = (matriculasData ?? []) as unknown as MatriculaConfirmada[]

  const matriculaIdsPorHorario = new Map<number, number[]>()
  for (const m of matriculas) {
    const lista = matriculaIdsPorHorario.get(m.horario_final_id) ?? []
    lista.push(m.id)
    matriculaIdsPorHorario.set(m.horario_final_id, lista)
  }

  const todasMatriculaIds = matriculas.map((m) => m.id)
  const { data: presencasData } =
    todasMatriculaIds.length > 0
      ? await supabase
          .from('presencas')
          .select('matricula_id, data')
          .in('matricula_id', todasMatriculaIds)
      : { data: [] }
  const marcadas = new Set(
    (presencasData ?? []).map((p) => `${p.matricula_id}|${p.data}`)
  )

  const hoje = hojeISO()
  let porConfirmar = 0
  for (const horario of horarios) {
    const idsAlunos = matriculaIdsPorHorario.get(horario.id) ?? []
    if (idsAlunos.length === 0) continue

    for (const data of datasDoDia(horario.dia_semana, INICIO_PRESENCAS, hoje)) {
      const marcadosNesseDia = idsAlunos.filter((id) => marcadas.has(`${id}|${data}`)).length
      if (marcadosNesseDia < idsAlunos.length) {
        porConfirmar += 1
      }
    }
  }

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-semibold text-foreground">Presenças</h1>
        </div>

        <div className="hub-stack">
          <OptionCard
            href="/dashboard/presencas/confirmar"
            nome="Presenças por Confirmar"
            wide
            index={1}
            badge={porConfirmar}
          />
          <OptionCard
            href="/dashboard/presencas/historico"
            nome="Histórico de Presenças"
            wide
            index={2}
          />
        </div>
      </div>
    </main>
  )
}
