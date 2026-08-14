import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { LinhaLista, GrupoLista } from '@/components/lista'
import { EmptyState } from '@/components/empty-state'
import { formatarHora } from '@/lib/horarios-grade'
import { formatarSala } from '@/lib/sala'

type Aluno = {
  id: number
  instrumentos: { nome: string } | null
  alunos: { nome: string } | null
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
    .from('perfis_escola')
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
    .select('id, instrumentos(nome), alunos(nome)')
    .eq('horario_final_id', Number(horarioId))
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .order('criado_em')
  const alunos = (alunosData ?? []) as unknown as Aluno[]

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard/agenda" titulo={horario.dia_semana} subtitulo={<>{formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}
              {formatarSala(horario.salas) && ` — ${formatarSala(horario.salas)}`}</>} />

        {alunos.length === 0 ? (
          <EmptyState titulo="Não há alunos confirmados neste horário" />
        ) : (
          <GrupoLista>
            {alunos.map((aluno) => (
              <LinhaLista
                key={aluno.id}
                href={`/dashboard/agenda/${horarioId}/${aluno.id}`}
                titulo={aluno.alunos?.nome ?? ''}
                contexto={aluno.instrumentos?.nome}
              />
            ))}
          </GrupoLista>
        )}
      </div>
    </main>
  )
}
