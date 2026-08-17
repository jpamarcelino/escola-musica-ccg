import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/empty-state'
import { formatarHora, formatarSala, type DiaSemana } from '@ccg/core'

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
    dia_semana: DiaSemana
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
    <main id="conteudo-principal" className="partitura-pagina detalhe-aula-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard/agenda" className="partitura-voltar" aria-label="Voltar à agenda">←</Link>
          <div><p className="partitura-sobretitulo">Aula semanal</p><h1>{horario.dia_semana}</h1><p>{formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}{formatarSala(horario.salas) && ` · ${formatarSala(horario.salas)}`}</p></div>
        </header>

        {alunos.length === 0 ? (
          <EmptyState titulo="Não há alunos confirmados neste horário" />
        ) : (
          <section className="detalhe-aula-alunos" aria-labelledby="alunos-aula-titulo">
            <header><p className="partitura-indice">01</p><h2 id="alunos-aula-titulo">Alunos nesta aula</h2><span>{alunos.length}</span></header>
            <div>
            {alunos.map((aluno) => (
              <Link
                key={aluno.id}
                href={`/dashboard/agenda/${horarioId}/${aluno.id}`}
              ><strong>{aluno.alunos?.nome}</strong><span>{aluno.instrumentos?.nome}</span><i aria-hidden="true">→</i></Link>
            ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
