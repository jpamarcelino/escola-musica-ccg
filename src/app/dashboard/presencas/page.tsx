import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatarHora } from '@/lib/horarios-grade'
import { formatarSala } from '@/lib/sala'
import { datasDoDia, INICIO_PRESENCAS, hojeISO } from '@/lib/datas'
import { BackButton } from '@/components/back-button'
import { PresencasTabs } from '@/components/presencas-tabs'

type Horario = {
  id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  salas: { nome: string; piso: number | null; numero: number | null } | null
}

type MatriculaConfirmada = {
  id: number
  horario_final_id: number
}

type Pendente = {
  horarioId: number
  data: string
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  sala: string | null
  totalAlunos: number
  marcados: number
}

export default async function PresencasPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>
}) {
  const { guardado } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: horariosData } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero)')
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
  const pendentes: Pendente[] = []
  for (const horario of horarios) {
    const idsAlunos = matriculaIdsPorHorario.get(horario.id) ?? []
    if (idsAlunos.length === 0) continue

    for (const data of datasDoDia(horario.dia_semana, INICIO_PRESENCAS, hoje)) {
      const marcadosNesseDia = idsAlunos.filter((id) => marcadas.has(`${id}|${data}`)).length
      if (marcadosNesseDia < idsAlunos.length) {
        pendentes.push({
          horarioId: horario.id,
          data,
          dia_semana: horario.dia_semana,
          hora_inicio: horario.hora_inicio,
          hora_fim: horario.hora_fim,
          sala: formatarSala(horario.salas),
          totalAlunos: idsAlunos.length,
          marcados: marcadosNesseDia,
        })
      }
    }
  }
  pendentes.sort((a, b) => a.data.localeCompare(b.data) || a.hora_inicio.localeCompare(b.hora_inicio))

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-semibold text-foreground">Presenças</h1>
        </div>

        <PresencasTabs ativo="confirmar" />

        {guardado && <p className="text-sm text-green-700">Presenças guardadas.</p>}

        {pendentes.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Não há aulas por confirmar — está tudo em dia.
          </p>
        ) : (
          <div className="space-y-2">
            {pendentes.map((p) => (
              <Link
                key={`${p.horarioId}|${p.data}`}
                href={`/dashboard/presencas/${p.horarioId}?data=${p.data}`}
                className="lista-item block"
              >
                <p className="lista-item-titulo">
                  {p.data} — {p.dia_semana}, {formatarHora(p.hora_inicio)}–{formatarHora(p.hora_fim)}
                </p>
                <p className="lista-item-sub">
                  {p.sala && `${p.sala} — `}
                  {p.marcados}/{p.totalAlunos} aluno{p.totalAlunos === 1 ? '' : 's'} marcado{p.marcados === 1 ? '' : 's'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
