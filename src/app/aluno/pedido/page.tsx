import Link from 'next/link'
import type { CSSProperties } from 'react'
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
import { HOUR_HEIGHT, paraMinutos, formatarHora } from '@/lib/horarios-grade'

// Dias mostrados na grelha, da esquerda para a direita. Sem Domingo — a
// escola não funciona nesse dia.
const DIAS_GRADE = DIAS_SEMANA.slice(0, 6)

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
  // Traz também os bloqueados (não só os "aberto") — continuam visíveis na
  // grelha, a preto e branco e sem poder ser escolhidos, para o aluno ver
  // o horário completo do professor.
  const { data: horarios } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, estado')
    .eq('professor_id', professor)

  const horariosGrade = (horarios ?? []).filter((h) =>
    DIAS_GRADE.includes(h.dia_semana)
  )
  const semHorarios = horariosGrade.length === 0

  // A grelha só mostra as horas entre a aula mais cedo e a mais tarde deste
  // professor (arredondadas à hora certa), não um intervalo fixo do dia.
  const horaInicioGrade = semHorarios
    ? 0
    : Math.floor(
        Math.min(...horariosGrade.map((h) => paraMinutos(h.hora_inicio))) / 60
      )
  const horaFimGrade = semHorarios
    ? 0
    : Math.ceil(
        Math.max(...horariosGrade.map((h) => paraMinutos(h.hora_fim))) / 60
      )
  const horas = Array.from(
    { length: horaFimGrade - horaInicioGrade },
    (_, i) => horaInicioGrade + i
  )
  const alturaGrade = horas.length * HOUR_HEIGHT

  const horariosPorDia = new Map<string, typeof horariosGrade>()
  for (const dia of DIAS_GRADE) horariosPorDia.set(dia, [])
  for (const h of horariosGrade) horariosPorDia.get(h.dia_semana)?.push(h)
  for (const dia of DIAS_GRADE) {
    horariosPorDia.get(dia)?.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }

  // Ordem para a entrada animada dos cartões (dia a dia, de cima para
  // baixo em cada coluna) — a mesma cascata usada nos cartões de opção.
  const indicePorHorario = new Map<number, number>()
  let indiceAtual = 0
  for (const dia of DIAS_GRADE) {
    for (const h of horariosPorDia.get(dia) ?? []) {
      indicePorHorario.set(h.id, indiceAtual)
      indiceAtual += 1
    }
  }

  return (
    <Wizard
      title="Seleciona os vários horários em que tens disponibilidade"
      voltar={`/aluno/pedido?programa=${programa}&instrumento=${instrumento}`}
    >
      <form action={escolherDisponibilidades} className="space-y-4">
        <input type="hidden" name="instrumentoId" value={instrumento} />
        <input type="hidden" name="professorId" value={professor} />
        {semHorarios ? (
          <p className="text-sm text-foreground/60">
            Este professor ainda não tem horários disponíveis. Podes deixar-lhe
            uma mensagem em baixo.
          </p>
        ) : (
          <>
            <p className="text-xs text-foreground/50">
              Podes escolher várias opções — o professor decide depois qual
              fica confirmada.
            </p>
            <div className="horarios-grade">
              <div className="horarios-coluna-horas">
                <div className="horarios-coluna-horas-cabecalho" />
                {horas.map((hora) => (
                  <div
                    key={hora}
                    className="horarios-hora-label"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    {hora}h
                  </div>
                ))}
              </div>
              {DIAS_GRADE.map((dia) => (
                <div key={dia} className="horarios-coluna-dia">
                  <div className="horarios-coluna-dia-cabecalho">
                    {dia.slice(0, 3)}
                  </div>
                  <div
                    className="horarios-coluna-dia-corpo"
                    style={{
                      height: alturaGrade,
                      backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
                    }}
                  >
                    {horariosPorDia.get(dia)?.map((h) => {
                      const inicioMin = paraMinutos(h.hora_inicio)
                      const fimMin = paraMinutos(h.hora_fim)
                      const estilo = {
                        top: ((inicioMin - horaInicioGrade * 60) / 60) * HOUR_HEIGHT,
                        height: ((fimMin - inicioMin) / 60) * HOUR_HEIGHT,
                        '--card-index': indicePorHorario.get(h.id) ?? 0,
                      } as CSSProperties

                      if (h.estado === 'bloqueado') {
                        return (
                          <div
                            key={h.id}
                            className="horario-bloco entrada-esquerda bloqueado"
                            style={estilo}
                            aria-disabled="true"
                          >
                            <span>{formatarHora(h.hora_inicio)}</span>
                            <span>{formatarHora(h.hora_fim)}</span>
                          </div>
                        )
                      }

                      return (
                        <label
                          key={h.id}
                          className="horario-bloco entrada-esquerda"
                          style={estilo}
                        >
                          <input type="checkbox" name="horarios" value={h.id} />
                          <span>{formatarHora(h.hora_inicio)}</span>
                          <span>{formatarHora(h.hora_fim)}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="space-y-1">
          <label htmlFor="mensagem" className="block text-sm font-medium">
            Nenhum horário te dá jeito?
          </label>
          <textarea
            id="mensagem"
            name="mensagem"
            rows={3}
            maxLength={500}
            placeholder="Ex: só posso às quintas-feiras a partir das 16h — achas que dá para arranjar?"
            className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-foreground/50">
            Deixa uma mensagem ao professor em vez de escolher um horário. Ele
            decide se quer entrar em contacto contigo fora da app.
          </p>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2"
        >
          Enviar pedido
        </button>
      </form>
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
