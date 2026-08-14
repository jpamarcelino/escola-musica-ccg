import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth-context'
import { EmptyState } from '@/components/empty-state'
import { formatarHora } from '@/lib/horarios-grade'
import { formatarSala } from '@/lib/sala'
import { dataMaisRecenteDoDia } from '@/lib/datas'
import { marcarPresencas } from '@/lib/actions/presencas'
import { MensagemErro } from '@/components/mensagem'
import { PresencasChamadaForm } from '@/components/presencas-chamada-form'

type Aluno = {
  id: number
  instrumentos: { nome: string } | null
  alunos: { nome: string } | null
}

export default async function PresencasHorarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ horarioId: string }>
  searchParams: Promise<{ data?: string; erro?: string }>
}) {
  const { horarioId } = await params
  const { data: dataParam, erro } = await searchParams

  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
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

  const data = dataParam || dataMaisRecenteDoDia(horario.dia_semana)

  const { data: alunosData } = await supabase
    .from('matriculas')
    .select('id, instrumentos(nome), alunos(nome)')
    .eq('horario_final_id', Number(horarioId))
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .order('criado_em')
  const alunos = (alunosData ?? []) as unknown as Aluno[]

  const { data: presencasData } = await supabase
    .from('presencas')
    .select('matricula_id, estado')
    .eq('data', data)
    .in('matricula_id', alunos.map((a) => a.id))
  const estadoPorMatricula = new Map(
    (presencasData ?? []).map((p) => [p.matricula_id, p.estado])
  )

  return (
    <main id="conteudo-principal" className="partitura-pagina presencas-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard/presencas/confirmar" className="partitura-voltar" aria-label="Voltar às aulas por confirmar">←</Link>
          <div><p className="partitura-sobretitulo">Chamada · {data}</p><h1>{horario.dia_semana}</h1><p>{formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}{formatarSala(horario.salas) && ` · ${formatarSala(horario.salas)}`}</p></div>
        </header>

        <form method="get" className="presencas-data-form">
          <label htmlFor="data" className="text-sm text-foreground/60">
            Data da aula
          </label>
          <input
            id="data"
            type="date"
            name="data"
            defaultValue={data}
            className="h-[44px] border border-[var(--color-linha)] bg-white px-[12px] text-[14px]"
          />
          <button type="submit" className="h-[44px] border border-[var(--color-ink)] px-[16px] text-[14px] font-semibold">
            Ver
          </button>
        </form>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}

        {alunos.length === 0 ? (
          <EmptyState titulo="Não há alunos confirmados neste horário" />
        ) : (
          <PresencasChamadaForm
            action={marcarPresencas}
            horarioId={horarioId}
            data={data}
            alunos={alunos.map((aluno) => ({
              id: aluno.id,
              nome: aluno.alunos?.nome ?? 'Aluno',
              instrumento: aluno.instrumentos?.nome ?? null,
            }))}
            estadosIniciais={Object.fromEntries(estadoPorMatricula)}
          />
        )}
      </div>
    </main>
  )
}
