import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatarHora } from '@/lib/horarios-grade'
import { formatarSala } from '@/lib/sala'
import { BackButton } from '@/components/back-button'

type Confirmado = {
  horario_final_id: number | null
  horarios: {
    dia_semana: string
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

type Bloco = {
  horarioId: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  sala: string | null
  alunos: number
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
    .from('profiles')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: confirmadosData } = await supabase
    .from('matriculas')
    .select(
      'horario_final_id, horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
    )
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .not('horario_final_id', 'is', null)
  const confirmados = (confirmadosData ?? []) as unknown as Confirmado[]

  const blocosPorHorario = new Map<number, Bloco>()
  for (const c of confirmados) {
    if (!c.horario_final_id || !c.horarios) continue
    const bloco = blocosPorHorario.get(c.horario_final_id) ?? {
      horarioId: c.horario_final_id,
      dia_semana: c.horarios.dia_semana,
      hora_inicio: c.horarios.hora_inicio,
      hora_fim: c.horarios.hora_fim,
      sala: formatarSala(c.horarios.salas),
      alunos: 0,
    }
    bloco.alunos += 1
    blocosPorHorario.set(c.horario_final_id, bloco)
  }
  const blocos = [...blocosPorHorario.values()].sort(
    (a, b) =>
      a.dia_semana.localeCompare(b.dia_semana) || a.hora_inicio.localeCompare(b.hora_inicio)
  )

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-semibold text-foreground">Presenças</h1>
        </div>

        {blocos.length === 0 ? (
          <p className="text-sm text-foreground/60">Ainda não tens aulas confirmadas.</p>
        ) : (
          <div className="space-y-2">
            {blocos.map((b) => (
              <Link key={b.horarioId} href={`/dashboard/presencas/${b.horarioId}`} className="lista-item block">
                <p className="lista-item-titulo">
                  {b.dia_semana}, {formatarHora(b.hora_inicio)}–{formatarHora(b.hora_fim)}
                </p>
                <p className="lista-item-sub">
                  {b.sala && `${b.sala} — `}
                  {b.alunos} aluno{b.alunos === 1 ? '' : 's'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
