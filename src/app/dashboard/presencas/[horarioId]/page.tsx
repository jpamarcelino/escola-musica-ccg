import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { formatarHora } from '@/lib/horarios-grade'
import { formatarSala } from '@/lib/sala'
import { dataMaisRecenteDoDia } from '@/lib/datas'
import { marcarPresencas } from '@/lib/actions/presencas'

type Aluno = {
  id: number
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
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
    .select('id, instrumentos(nome), profiles!matriculas_aluno_id_fkey(nome)')
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
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard/presencas" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{horario.dia_semana}</h1>
            <p className="text-sm text-foreground/60">
              {formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}
              {formatarSala(horario.salas) && ` — ${formatarSala(horario.salas)}`}
            </p>
          </div>
        </div>

        <form method="get" className="flex items-center gap-2">
          <label htmlFor="data" className="text-sm text-foreground/60">
            Data da aula
          </label>
          <input
            id="data"
            type="date"
            name="data"
            defaultValue={data}
            className="rounded border border-foreground/20 px-2 py-1 text-sm"
          />
          <button type="submit" className="rounded border border-foreground/20 px-3 py-1 text-sm">
            Ver
          </button>
        </form>

        {erro && <p className="text-sm text-red-600">{decodeURIComponent(erro)}</p>}

        {alunos.length === 0 ? (
          <p className="text-sm text-foreground/60">Não há alunos confirmados neste horário.</p>
        ) : (
          <form action={marcarPresencas} className="space-y-4">
            <input type="hidden" name="horarioId" value={horarioId} />
            <input type="hidden" name="data" value={data} />
            <div className="space-y-3">
              {alunos.map((aluno) => (
                <div key={aluno.id} className="lista-item">
                  <p className="lista-item-titulo">{aluno.profiles?.nome}</p>
                  {aluno.instrumentos?.nome && (
                    <p className="lista-item-sub">{aluno.instrumentos.nome}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {ESTADOS.map((e) => (
                      <label key={e.valor} className="flex items-center gap-1 text-sm">
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
                </div>
              ))}
            </div>
            <button type="submit" className="botao-cartao">
              Guardar presenças
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
