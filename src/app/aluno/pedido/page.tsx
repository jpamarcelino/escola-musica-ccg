import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { escolherDisponibilidades } from '@/lib/actions/aluno'
import { DIAS_SEMANA } from '@/lib/dias-semana'
import { OptionCard } from '@/components/option-card'

// Afinação fina do tamanho de cada ícone de instrumento dentro do cartão
// (percentagem de espaço à volta — menos padding = ícone maior). Sem
// entrada aqui, usa o valor por omissão definido em globals.css.
const ICONE_PADDING: Record<string, string | undefined> = {
  Guitarra: '14%',
  'Baixo Elétrico': '14%',
  Bateria: '14%',
  Concertina: '18%',
  'Teoria Musical': '18%',
}

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
      <Wizard>
        <div className="option-stack">
          <OptionCard href="/aluno/pedido?programa=musica" nome={'Escola\nde\nMúsica'} wide />
          <OptionCard href="/aluno/pedido?programa=danca" nome={'Escola\nde\nDança'} wide />
        </div>
      </Wizard>
    )
  }

  // Passo 2: escolher disciplina
  if (!instrumento) {
    const { data: instrumentos } = await supabase
      .from('instrumentos')
      .select('id, nome, imagem_url')
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
        <div className="option-grid">
          {instrumentos?.map((i) => (
            <OptionCard
              key={i.id}
              href={`/aluno/pedido?programa=${programa}&instrumento=${i.id}`}
              nome={i.nome}
              imagemUrl={i.imagem_url}
              icone
              iconePadding={ICONE_PADDING[i.nome]}
            />
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
        {professores.length ? (
          <div className="option-grid">
            {professores.map((p) => (
              <OptionCard
                key={p.professor_id}
                href={`/aluno/pedido?programa=${programa}&instrumento=${instrumento}&professor=${p.professor_id}`}
                nome={p.profiles?.nome ?? ''}
                imagemUrl={p.profiles?.foto_url}
                subtitulo={p.especialidade}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/60">
            Ainda não há professores para esta disciplina.
          </p>
        )}
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
  title?: string
  voltar?: string
  children: React.ReactNode
}) {
  return (
    <main className="flex-1 flex items-start justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
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
