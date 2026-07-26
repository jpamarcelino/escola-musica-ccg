import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { escolherDisponibilidades } from '@/lib/actions/aluno'
import { DIAS_SEMANA } from '@/lib/dias-semana'
import { OptionCard } from '@/components/option-card'
import { calcularIdade } from '@/lib/idade'
import {
  MUSICA_IDADE_MIN,
  MUSICA_IDADE_MAX,
  separarFaixaEtaria,
  parseFaixaEtaria,
  dentroDaFaixa,
  elegivelParaDisciplina,
} from '@/lib/idade-disciplinas'

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

// Idem, para os ícones das modalidades de dança (chave = título sem a
// faixa etária). Por omissão usam iconePadding="12%" (ver mais abaixo).
const DANCA_ICONE_PADDING: Record<string, string> = {
  'Ballet Clássico': '12%',
  'Dança Moderna': '9%',
  'Dança Contemporânea': '9%',
  'Dança Moderna para Adultos': '5%',
  'Estilos Urbanos': '5%',
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
    .select('tipo, data_nascimento')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'aluno') {
    redirect('/dashboard')
  }

  const idadeAluno = calcularIdade(profile.data_nascimento)

  // Passo 1: escolher escola
  if (programa !== 'musica' && programa !== 'danca') {
    return (
      <Wizard voltar="/dashboard">
        <div className="option-stack">
          <OptionCard href="/aluno/pedido?programa=musica" nome={'Escola\nde\nMúsica'} wide index={0} />
          <OptionCard href="/aluno/pedido?programa=danca" nome={'Escola\nde\nDança'} wide index={1} />
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

    // As disciplinas dentro da idade do aluno aparecem primeiro, com o
    // estilo normal; as restantes ficam por baixo, a preto e branco e sem
    // poderem ser escolhidas. Sem data de nascimento, nada fica bloqueado.
    const itens = (instrumentos ?? []).map((i) => {
      if (programa === 'danca') {
        const { titulo, idade } = separarFaixaEtaria(i.nome)
        return {
          ...i,
          titulo,
          idade,
          elegivel: dentroDaFaixa(idadeAluno, parseFaixaEtaria(idade)),
        }
      }
      return {
        ...i,
        titulo: i.nome,
        idade: undefined as string | undefined,
        elegivel: dentroDaFaixa(idadeAluno, {
          min: MUSICA_IDADE_MIN,
          max: MUSICA_IDADE_MAX,
        }),
      }
    })
    const ordenados = [
      ...itens.filter((i) => i.elegivel),
      ...itens.filter((i) => !i.elegivel),
    ]

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
          {ordenados.map((i, idx) =>
            programa === 'danca' ? (
              <OptionCard
                key={i.id}
                href={`/aluno/pedido?programa=${programa}&instrumento=${i.id}`}
                nome={i.titulo}
                subtitulo={i.idade}
                imagemUrl={i.imagem_url}
                icone
                iconePadding={DANCA_ICONE_PADDING[i.titulo] ?? '12%'}
                tituloNegrito
                index={idx}
                bloqueado={!i.elegivel}
              />
            ) : (
              <OptionCard
                key={i.id}
                href={`/aluno/pedido?programa=${programa}&instrumento=${i.id}`}
                nome={i.nome}
                imagemUrl={i.imagem_url}
                icone
                iconePadding={ICONE_PADDING[i.nome]}
                index={idx}
                bloqueado={!i.elegivel}
              />
            )
          )}
        </div>
      </Wizard>
    )
  }

  const { data: instrumentoAtual } = await supabase
    .from('instrumentos')
    .select('nome')
    .eq('id', instrumento)
    .single()

  // Reforça aqui o mesmo bloqueio do Passo 2 — protege quem chega
  // diretamente a este link (ex: partilhado, ou o "Voltar" do browser)
  // sem passar pela grelha de cartões, onde a disciplina já estaria
  // desativada. A ação que cria mesmo o pedido (escolherDisponibilidades)
  // repete esta verificação no servidor, que é o que impede de facto.
  if (
    instrumentoAtual &&
    !elegivelParaDisciplina(idadeAluno, programa, instrumentoAtual.nome)
  ) {
    return (
      <Wizard
        title="Não disponível para a tua idade"
        voltar={`/aluno/pedido?programa=${programa}`}
      >
        <p className="text-sm text-foreground/60">
          Esta disciplina não está disponível para a tua idade.
        </p>
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
            {professores.map((p, idx) => (
              <OptionCard
                key={p.professor_id}
                href={`/aluno/pedido?programa=${programa}&instrumento=${instrumento}&professor=${p.professor_id}`}
                nome={p.profiles?.nome ?? ''}
                imagemUrl={p.profiles?.foto_url}
                subtitulo={p.especialidade}
                index={idx}
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
        {voltar && (
          <Link href={voltar} className="back-button" aria-label="Voltar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M15 5 L8 12 L15 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        )}
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
        {children}
      </div>
    </main>
  )
}
