import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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
          <form action={marcarPresencas} className="presencas-chamada">
            <input type="hidden" name="horarioId" value={horarioId} />
            <input type="hidden" name="data" value={data} />
            <div className="presencas-chamada-lista">
              {alunos.map((aluno) => (
                <fieldset key={aluno.id} className="presencas-aluno-chamada">
                  <legend><strong>{aluno.alunos?.nome}</strong>{aluno.instrumentos?.nome && <small>{aluno.instrumentos.nome}</small>}</legend>
                  <div className="presencas-estados">
                    {ESTADOS.map((e) => (
                      <label key={e.valor} data-estado={e.valor}>
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
              className="presencas-guardar"
            >
              Guardar presenças
            </SubmitButton>
          </form>
        )}
      </div>
    </main>
  )
}
