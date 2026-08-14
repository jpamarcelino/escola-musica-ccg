import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { datasDoDia, INICIO_PRESENCAS, hojeISO } from '@/lib/datas'
import { PageHeader } from '@/components/page-header'
import { LinhaLista, GrupoLista } from '@/components/lista'
import { Distintivo } from '@/components/distintivo'

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

  const [{ data: profile }, { data: horariosData }, { data: matriculasData }] =
    await Promise.all([
      supabase.from('perfis_escola').select('tipo').eq('id', user.id).single(),
      supabase.from('horarios').select('id, dia_semana').eq('professor_id', user.id),
      supabase
        .from('matriculas')
        .select('id, horario_final_id')
        .eq('professor_id', user.id)
        .eq('estado', 'confirmado')
        .not('horario_final_id', 'is', null),
    ])

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const horarios = (horariosData ?? []) as unknown as Horario[]
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
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader
          voltar="/dashboard"
          titulo="Presenças"
          subtitulo={
            porConfirmar > 0
              ? <>{porConfirmar} {porConfirmar === 1 ? 'aula precisa' : 'aulas precisam'} de confirmação.</>
              : <>Tudo confirmado até hoje.</>
          }
        />

        <GrupoLista>
          <LinhaLista
            href="/dashboard/presencas/confirmar"
            titulo={porConfirmar > 0 ? 'Confirmar presenças' : 'Presenças confirmadas'}
            contexto={porConfirmar > 0 ? 'Começa pelas aulas mais antigas' : 'Não tens ações pendentes'}
            direita={porConfirmar > 0 ? <Distintivo>{porConfirmar}</Distintivo> : undefined}
          />
          <LinhaLista href="/dashboard/presencas/historico" titulo="Histórico de Presenças" />
        </GrupoLista>
      </div>
    </main>
  )
}
