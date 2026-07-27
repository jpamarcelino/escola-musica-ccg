import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { OptionCard } from '@/components/option-card'
import { formatarHora } from '@/lib/horarios-grade'
import { formatarSala } from '@/lib/sala'

type Aluno = {
  id: number
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
}

export default async function AgendaHorarioPage({
  params,
}: {
  params: Promise<{ horarioId: string }>
}) {
  const { horarioId } = await params

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

  const { data: horarioData } = await supabase
    .from('horarios')
    .select('dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero)')
    .eq('id', Number(horarioId))
    .eq('professor_id', user.id)
    .maybeSingle()
  const horario = horarioData as unknown as {
    dia_semana: string
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null

  if (!horario) {
    notFound()
  }

  const { data: alunosData } = await supabase
    .from('matriculas')
    .select('id, instrumentos(nome), profiles!matriculas_aluno_id_fkey(nome)')
    .eq('horario_final_id', Number(horarioId))
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .order('criado_em')
  const alunos = (alunosData ?? []) as unknown as Aluno[]

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard/agenda" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {horario.dia_semana}
            </h1>
            <p className="text-sm text-foreground/60">
              {formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}
              {formatarSala(horario.salas) && ` — ${formatarSala(horario.salas)}`}
            </p>
          </div>
        </div>

        {alunos.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Não há alunos confirmados neste horário.
          </p>
        ) : (
          <div className="hub-stack">
            {alunos.map((aluno, idx) => (
              <OptionCard
                key={aluno.id}
                href={`/dashboard/agenda/${horarioId}/${aluno.id}`}
                nome={aluno.profiles?.nome ?? ''}
                subtitulo={aluno.instrumentos?.nome}
                wide
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
