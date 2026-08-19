import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { aceitarReposicao, recusarReposicao, marcarReposicaoManual } from '@/lib/actions/professor'
import { SubmitButton } from '@/components/submit-button'
import { Rotulo, classesCampo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { EmptyState } from '@/components/empty-state'
import { formatarDataEscolar, formatarHora, hojeISO, plural } from '@ccg/core'

type Pedido = {
  id: number
  mensagem: string | null
  estado: string
  expira_em: string
  criado_em: string
  aluno_id: string
  aulas_desmarcadas: {
    id: number
    data: string
    hora_inicio: string
    hora_fim: string
    instrumento_nome: string | null
    matricula_id: number
  } | null
  pedidos_reposicao_horarios: {
    horarios_reposicao: {
      id: number
      data: string
      hora_inicio: string
      hora_fim: string
      estado: string
    } | null
  }[]
}

const ROTULO_ESTADO: Record<string, string> = {
  pendente: 'Pendente',
  agendada: 'Agendada',
  nao_possivel: 'Não foi possível',
  expirada: 'Expirada',
}

function diasRestantes(expiraEm: string): number {
  const hoje = new Date(`${hojeISO()}T00:00:00`)
  const fim = new Date(`${expiraEm}T00:00:00`)
  return Math.round((fim.getTime() - hoje.getTime()) / 86_400_000)
}

// Os pedidos de reposição que chegaram ao professor, e a marcação manual.
//
// As duas coisas na mesma página de propósito: quando um pedido não dá
// para aceitar como está — o aluno escolheu horários que já não servem, o
// prazo passou, ou a aula foi desmarcada pelo próprio professor e nunca
// houve pedido — a saída é marcar à mão, e não deve obrigar a ir procurar
// noutro ecrã.
export default async function PedidosReposicaoPage({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string
    agendada?: string
    recusada?: string
    marcada?: string
  }>
}) {
  const { erro, agendada, recusada, marcada } = await searchParams
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }
  if (profile?.tipo !== 'professor' || profile.programa !== 'musica') {
    redirect('/dashboard')
  }

  const [{ data: pedidosData }, { data: porReporData }, { data: alunosData }] = await Promise.all([
    supabase
      .from('pedidos_reposicao')
      .select(
        'id, mensagem, estado, expira_em, criado_em, aluno_id, aulas_desmarcadas(id, data, hora_inicio, hora_fim, instrumento_nome, matricula_id), pedidos_reposicao_horarios(horarios_reposicao(id, data, hora_inicio, hora_fim, estado))'
      )
      .eq('professor_id', user.id)
      .order('criado_em', { ascending: false }),
    // As aulas que o professor desmarcou e ainda não repôs. Não têm
    // pedido do aluno — a reposição é ele que a marca.
    supabase
      .from('aulas_desmarcadas')
      .select('id, data, hora_inicio, hora_fim, instrumento_nome, matricula_id, aluno_id')
      .eq('professor_id', user.id)
      .eq('reposicao_estado', 'por_repor')
      .order('data'),
    supabase
      .from('matriculas')
      .select('id, alunos(nome), instrumentos(nome)')
      .eq('professor_id', user.id)
      .eq('estado', 'confirmado'),
  ])

  const pedidos = (pedidosData ?? []) as unknown as Pedido[]
  const porRepor = (porReporData ?? []) as unknown as {
    id: number
    data: string
    hora_inicio: string
    hora_fim: string
    instrumento_nome: string | null
    matricula_id: number
    aluno_id: string
  }[]
  const matriculas = (alunosData ?? []) as unknown as {
    id: number
    alunos: { nome: string } | null
    instrumentos: { nome: string } | null
  }[]

  // Os nomes vêm das matrículas — `pedidos_reposicao` guarda só o id do
  // aluno, e juntar mais um join à consulta principal por causa do nome
  // não valia a linha.
  const nomePorMatricula = new Map(matriculas.map((m) => [m.id, m.alunos?.nome ?? '']))

  const pendentes = pedidos.filter((p) => p.estado === 'pendente')
  const resolvidos = pedidos.filter((p) => p.estado !== 'pendente')

  return (
    <main id="conteudo-principal" className="partitura-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard/reposicoes" className="partitura-voltar" aria-label="Voltar aos horários de reposição">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Aulas de reposição</p>
            <h1>Pedidos</h1>
            <p>
              {pendentes.length === 0
                ? 'Nenhum pedido à espera de resposta.'
                : `${plural(pendentes.length, 'pedido por responder', 'pedidos por responder')}.`}
            </p>
          </div>
        </header>

        {erro && <MensagemErro>{erro}</MensagemErro>}
        {agendada && <MensagemInfo>Reposição marcada. O aluno foi avisado.</MensagemInfo>}
        {recusada && <MensagemInfo>Resposta enviada ao aluno.</MensagemInfo>}
        {marcada && <MensagemInfo>Reposição marcada. O aluno foi avisado.</MensagemInfo>}

        <section className="space-y-4 pt-6">
          <h2 className="font-semibold">Por responder</h2>
          {pendentes.length === 0 ? (
            <EmptyState titulo="Nenhum pedido pendente" />
          ) : (
            <div className="space-y-4">
              {pendentes.map((p) => {
                const aula = p.aulas_desmarcadas
                const dias = diasRestantes(p.expira_em)
                // Uma opção que entretanto foi ocupada por outro aluno
                // deixa de poder ser aceite — mas continua à vista, para o
                // professor perceber porque é que a lista encolheu.
                const opcoes = p.pedidos_reposicao_horarios
                  .map((o) => o.horarios_reposicao)
                  .filter((o): o is NonNullable<typeof o> => o !== null)
                  .sort((a, b) => a.data.localeCompare(b.data))
                const livres = opcoes.filter((o) => o.estado === 'disponivel')

                return (
                  <article key={p.id} className="lista-item space-y-3">
                    <div>
                      <p className="lista-item-titulo">
                        {aula ? nomePorMatricula.get(aula.matricula_id) : ''} ·{' '}
                        {aula?.instrumento_nome}
                      </p>
                      <p className="lista-item-sub">
                        Aula de{' '}
                        {aula
                          ? formatarDataEscolar(aula.data, { day: 'numeric', month: 'long' })
                          : '—'}
                        , {aula ? formatarHora(aula.hora_inicio) : ''} ·{' '}
                        {dias > 0
                          ? `${plural(dias, 'dia restante', 'dias restantes')}`
                          : 'expira hoje'}
                      </p>
                    </div>

                    {p.mensagem && (
                      <p className="text-sm text-foreground/70">“{p.mensagem}”</p>
                    )}

                    {livres.length === 0 ? (
                      <p className="text-sm text-foreground/60">
                        Os horários que este aluno escolheu já estão ocupados. Marca a reposição à
                        mão, em baixo, ou responde que não é possível.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {livres.map((o) => (
                          <form key={o.id} action={aceitarReposicao} className="flex items-center gap-3">
                            <input type="hidden" name="pedidoId" value={p.id} />
                            <input type="hidden" name="horarioId" value={o.id} />
                            <span className="flex-1 text-sm">
                              {formatarDataEscolar(o.data, {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                              , {formatarHora(o.hora_inicio)}–{formatarHora(o.hora_fim)}
                            </span>
                            <SubmitButton
                              textoAGuardar="A marcar…"
                              className="shrink-0 rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] px-4 py-[8px] text-[13px] font-semibold"
                            >
                              Aceitar
                            </SubmitButton>
                          </form>
                        ))}
                      </div>
                    )}

                    <form action={recusarReposicao} className="space-y-2 border-t border-[var(--color-linha)] pt-3">
                      <input type="hidden" name="pedidoId" value={p.id} />
                      <label htmlFor={`resposta-${p.id}`} className="block text-[12.5px] font-medium">
                        Não é possível <span className="text-foreground/50">(mensagem opcional)</span>
                      </label>
                      <input
                        id={`resposta-${p.id}`}
                        name="resposta"
                        type="text"
                        maxLength={500}
                        className={classesCampo}
                      />
                      <SubmitButton
                        textoAGuardar="A enviar…"
                        className="rounded-[var(--radius-pill)] border-[1.5px] border-[#9A3B2E] px-4 py-[8px] text-[13px] font-semibold text-[#9A3B2E]"
                      >
                        Não é possível
                      </SubmitButton>
                    </form>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* As que o professor desmarcou. Nunca houve pedido do aluno — o
            enunciado é claro em que a reposição fica do lado dele. */}
        {porRepor.length > 0 && (
          <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
            <h2 className="font-semibold">Aulas que desmarcaste</h2>
            <p className="text-sm text-foreground/60">
              Estas esperam reposição tua. Marca-a em baixo.
            </p>
            <div className="space-y-2">
              {porRepor.map((a) => (
                <p key={a.id} className="lista-item lista-item-sub">
                  {nomePorMatricula.get(a.matricula_id)} · {a.instrumento_nome} ·{' '}
                  {formatarDataEscolar(a.data, { day: 'numeric', month: 'long' })},{' '}
                  {formatarHora(a.hora_inicio)}
                </p>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4 border-t border-[var(--color-linha)] pt-6">
          <h2 className="font-semibold">Marcar uma reposição à mão</h2>
          <p className="text-sm text-foreground/60">
            Sem pedido, com o prazo passado, ou para uma aula que desmarcaste. Não precisa de vaga
            criada antes.
          </p>
          <form action={marcarReposicaoManual} className="space-y-3">
            <div className="space-y-[6px]">
              <Rotulo htmlFor="reposicao-manual-aluno">Aluno</Rotulo>
              <select
                id="reposicao-manual-aluno"
                name="matriculaId"
                required
                defaultValue=""
                className={classesCampo}
              >
                <option value="" disabled>
                  Escolhe
                </option>
                {matriculas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.alunos?.nome} · {m.instrumentos?.nome}
                  </option>
                ))}
              </select>
            </div>

            {porRepor.length > 0 && (
              <div className="space-y-[6px]">
                <Rotulo htmlFor="reposicao-manual-aula">Aula a repor</Rotulo>
                {/* Ligar a reposição à aula desmarcada é o que fecha o
                    cancelamento. Sem isto, a aula ficava para sempre a
                    dizer "por repor" mesmo depois de reposta. */}
                <select
                  id="reposicao-manual-aula"
                  name="aulaDesmarcadaId"
                  defaultValue=""
                  className={classesCampo}
                >
                  <option value="">Nenhuma em concreto</option>
                  {porRepor.map((a) => (
                    <option key={a.id} value={a.id}>
                      {nomePorMatricula.get(a.matricula_id)} ·{' '}
                      {formatarDataEscolar(a.data, { day: 'numeric', month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-[6px]">
              <Rotulo htmlFor="reposicao-manual-data">Dia</Rotulo>
              <input
                id="reposicao-manual-data"
                name="data"
                type="date"
                required
                className={classesCampo}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-[6px]">
                <Rotulo htmlFor="reposicao-manual-inicio">Começa</Rotulo>
                <input
                  id="reposicao-manual-inicio"
                  name="horaInicio"
                  type="time"
                  required
                  className={classesCampo}
                />
              </div>
              <div className="flex-1 space-y-[6px]">
                <Rotulo htmlFor="reposicao-manual-fim">Acaba</Rotulo>
                <input
                  id="reposicao-manual-fim"
                  name="horaFim"
                  type="time"
                  required
                  className={classesCampo}
                />
              </div>
            </div>
            <SubmitButton
              textoAGuardar="A marcar…"
              className="flex h-[52px] w-full items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-raised)] disabled:opacity-50 motion-reduce:transition-none sm:w-auto sm:px-7"
            >
              Marcar reposição
            </SubmitButton>
          </form>
        </section>

        {resolvidos.length > 0 && (
          <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
            <h2 className="font-semibold">Já respondidos</h2>
            <div className="space-y-2">
              {resolvidos.map((p) => (
                <p key={p.id} className="lista-item lista-item-sub">
                  {p.aulas_desmarcadas
                    ? `${nomePorMatricula.get(p.aulas_desmarcadas.matricula_id)} · ${formatarDataEscolar(p.aulas_desmarcadas.data, { day: 'numeric', month: 'long' })}`
                    : '—'}{' '}
                  · {ROTULO_ESTADO[p.estado] ?? p.estado}
                </p>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
