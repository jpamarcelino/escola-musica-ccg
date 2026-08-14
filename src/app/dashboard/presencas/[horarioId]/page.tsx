import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { formatarHora } from '@/lib/horarios-grade'
import { formatarSala } from '@/lib/sala'
import { dataMaisRecenteDoDia } from '@/lib/datas'
import { marcarPresencas } from '@/lib/actions/presencas'
import { SubmitButton } from '@/components/submit-button'
import { MensagemErro } from '@/components/mensagem'

type Aluno = {
  id: number
  instrumentos: { nome: string } | null
  alunos: { nome: string } | null
}

const ESTADOS: { valor: string; label: string }[] = [
  { valor: 'presente', label: 'Presente' },
  { valor: 'falta_aviso', label: 'Falta c/ aviso' },
  { valor: 'falta_sem_aviso', label: 'Falta s/ aviso' },
]

export default async function PresencasHorarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ horarioId: string }>
  searchParams: Promise<{ data?: string; erro?: string }>
}) {
  const { horarioId } = await params
  const { data: dataParam, erro } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard/presencas/confirmar" titulo={horario.dia_semana} subtitulo={<>{formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}
              {formatarSala(horario.salas) && ` — ${formatarSala(horario.salas)}`}</>} />

        <form method="get" className="flex flex-wrap items-end gap-[8px] rounded-[var(--radius-medium)] bg-[var(--color-surface-raised)] p-[14px]">
          <label htmlFor="data" className="text-sm text-foreground/60">
            Data da aula
          </label>
          <input
            id="data"
            type="date"
            name="data"
            defaultValue={data}
            className="h-[44px] rounded-[var(--radius-small)] border border-[var(--color-linha)] bg-white px-[12px] text-[14px]"
          />
          <button type="submit" className="h-[44px] rounded-[var(--radius-pill)] border border-[var(--color-ink)] px-[16px] text-[14px] font-semibold">
            Ver
          </button>
        </form>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}

        {alunos.length === 0 ? (
          <EmptyState titulo="Não há alunos confirmados neste horário" />
        ) : (
          <form action={marcarPresencas} className="space-y-4">
            <input type="hidden" name="horarioId" value={horarioId} />
            <input type="hidden" name="data" value={data} />
            <div className="space-y-3">
              {alunos.map((aluno) => (
                <fieldset key={aluno.id} className="rounded-[var(--radius-medium)] bg-[var(--color-surface-raised)] p-[16px]">
                  <legend className="px-[2px] text-[15px] font-semibold">{aluno.alunos?.nome}</legend>
                  {aluno.instrumentos?.nome && (
                    <p className="text-[13px] text-[var(--color-text-secondary)]">{aluno.instrumentos.nome}</p>
                  )}
                  <div className="mt-[12px] grid gap-[8px] sm:grid-cols-3">
                    {ESTADOS.map((e) => (
                      <label key={e.valor} className="flex min-h-[48px] cursor-pointer items-center gap-[8px] rounded-[var(--radius-small)] border border-[var(--color-linha)] bg-white px-[12px] text-[14px] has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[rgba(27,79,122,.08)]">
                        <input
                          type="radio"
                          name={`estado_${aluno.id}`}
                          value={e.valor}
                          defaultChecked={estadoPorMatricula.get(aluno.id) === e.valor}
                        />
                        {e.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <SubmitButton
              textoAGuardar="A guardar..."
              className="flex min-h-[52px] w-full items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-ink)] px-[20px] text-[15px] font-semibold text-white disabled:opacity-50"
            >
              Guardar presenças
            </SubmitButton>
          </form>
        )}
      </div>
    </main>
  )
}
