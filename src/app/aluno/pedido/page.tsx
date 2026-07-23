import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { escolherDisponibilidades } from '@/lib/actions/aluno'
import { DIAS_SEMANA } from '@/lib/dias-semana'

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: Promise<{
    programa?: string
    instrumento?: string
    professor?: string
    erro?: string
  }>
}) {
  const { programa, instrumento, professor, erro } = await searchParams

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

  if (profile?.tipo !== 'aluno') {
    redirect('/dashboard')
  }

  // Passo 1: escolher escola
  if (programa !== 'musica' && programa !== 'danca') {
    return (
      <Wizard title="Que escola?">
        <div className="space-y-2">
          <Link
            href="/aluno/pedido?programa=musica"
            className="block rounded border border-foreground/20 px-4 py-2 hover:bg-foreground/5"
          >
            Escola de Música
          </Link>
          <Link
            href="/aluno/pedido?programa=danca"
            className="block rounded border border-foreground/20 px-4 py-2 hover:bg-foreground/5"
          >
            Escola de Dança
          </Link>
        </div>
      </Wizard>
    )
  }

  // Passo 2: escolher disciplina
  if (!instrumento) {
    const { data: instrumentos } = await supabase
      .from('instrumentos')
      .select('id, nome')
      .eq('programa', programa)
      .order('nome')

    return (
      <Wizard
        title={
          programa === 'musica'
            ? 'Que instrumento queres aprender?'
            : 'Que modalidade queres aprender?'
        }
        voltar="/aluno/pedido"
      >
        <div className="space-y-2">
          {instrumentos?.map((i) => (
            <Link
              key={i.id}
              href={`/aluno/pedido?programa=${programa}&instrumento=${i.id}`}
              className="block rounded border border-foreground/20 px-4 py-2 hover:bg-foreground/5"
            >
              {i.nome}
            </Link>
          ))}
        </div>
      </Wizard>
    )
  }

  const { data: matriculaExistente } = await supabase
    .from('matriculas')
    .select('id, estado')
    .eq('aluno_id', user.id)
    .eq('instrumento_id', instrumento)
    .in('estado', ['a_escolher', 'confirmado'])
    .maybeSingle()

  if (matriculaExistente) {
    return (
      <Wizard
        title="Já tens um pedido nesta disciplina"
        voltar={`/aluno/pedido?programa=${programa}`}
      >
        <p className="text-sm text-foreground/60">
          {matriculaExistente.estado === 'confirmado'
            ? 'Já tens uma aula confirmada nesta disciplina.'
            : 'Já tens um pedido pendente nesta disciplina.'}{' '}
          Cancela-o no dashboard antes de pedires outro professor para a mesma
          disciplina. Podes pedir outra disciplina à vontade.
        </p>
      </Wizard>
    )
  }

  // Passo 2: escolher professor
  if (!professor) {
    const { data: professoresData } = await supabase
      .from('professor_instrumentos')
      .select('professor_id, especialidade, profiles(nome, foto_url)')
      .eq('instrumento_id', instrumento)

    const professores = (
      (professoresData ?? []) as unknown as {
        professor_id: string
        especialidade: string | null
        profiles: { nome: string; foto_url: string | null } | null
      }[]
    ).sort((a, b) =>
      (a.profiles?.nome ?? '').localeCompare(b.profiles?.nome ?? '', 'pt')
    )

    return (
      <Wizard
        title="Escolhe o professor"
        voltar={`/aluno/pedido?programa=${programa}`}
      >
        <div className="space-y-2">
          {professores.length ? (
            professores.map((p) => (
              <Link
                key={p.professor_id}
                href={`/aluno/pedido?programa=${programa}&instrumento=${instrumento}&professor=${p.professor_id}`}
                className="flex items-center gap-3 rounded border border-foreground/20 px-4 py-2 hover:bg-foreground/5"
              >
                {p.profiles?.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.profiles.foto_url}
                    alt={p.profiles.nome}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs text-foreground/50">
                    {p.profiles?.nome?.slice(0, 1)}
                  </div>
                )}
                <div>
                  <p>{p.profiles?.nome}</p>
                  {p.especialidade && (
                    <p className="text-xs text-foreground/50">{p.especialidade}</p>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-foreground/60">
              Ainda não há professores para esta disciplina.
            </p>
          )}
        </div>
      </Wizard>
    )
  }

  // Passo 3: escolher horários
  const { data: horarios } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim')
    .eq('professor_id', professor)
    .eq('estado', 'aberto')

  const horariosOrdenados = (horarios ?? []).slice().sort((a, b) => {
    const diaA = DIAS_SEMANA.indexOf(a.dia_semana)
    const diaB = DIAS_SEMANA.indexOf(b.dia_semana)
    if (diaA !== diaB) return diaA - diaB
    return a.hora_inicio.localeCompare(b.hora_inicio)
  })

  return (
    <Wizard
      title="Escolhe os horários que te dão jeito"
      voltar={`/aluno/pedido?programa=${programa}&instrumento=${instrumento}`}
    >
      {horariosOrdenados.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Este professor ainda não tem horários disponíveis.
        </p>
      ) : (
        <form action={escolherDisponibilidades} className="space-y-4">
          <input type="hidden" name="instrumentoId" value={instrumento} />
          <input type="hidden" name="professorId" value={professor} />
          <p className="text-xs text-foreground/50">
            Podes escolher várias opções — o professor decide depois qual fica
            confirmada.
          </p>
          <div className="space-y-2">
            {horariosOrdenados.map((h) => (
              <label
                key={h.id}
                className="flex items-center gap-3 rounded border border-foreground/20 px-4 py-2"
              >
                <input type="checkbox" name="horarios" value={h.id} />
                {h.dia_semana}, {h.hora_inicio.slice(0, 5)}–
                {h.hora_fim.slice(0, 5)}
              </label>
            ))}
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button
            type="submit"
            className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2"
          >
            Enviar pedido
          </button>
        </form>
      )}
    </Wizard>
  )
}

function Wizard({
  title,
  voltar,
  children,
}: {
  title: string
  voltar?: string
  children: React.ReactNode
}) {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 border border-foreground/15 rounded-lg p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        {children}
        {voltar && (
          <Link href={voltar} className="block text-sm text-center underline">
            Voltar
          </Link>
        )}
      </div>
    </main>
  )
}
