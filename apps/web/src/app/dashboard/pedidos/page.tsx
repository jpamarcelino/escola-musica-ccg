import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth-context'
import { confirmarHorario, proporHorarioNoPedido, recusarPedido } from '@/lib/actions/professor'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { EmptyState } from '@/components/empty-state'
import { SubmitButton } from '@/components/submit-button'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { agoraNaEscola, DIAS_SEMANA, type DiaSemana } from '@ccg/core'

type Pedido = {
  id: number
  criado_em: string
  mensagem: string | null
  alunos: {
    nome: string
    encarregado: { telefone: string | null } | null
  } | null
  instrumentos: { nome: string } | null
  disponibilidades_selecionadas: {
    horario_id: number
    horarios: { dia_semana: DiaSemana; hora_inicio: string; hora_fim: string } | null
  }[]
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; guardado?: string }>
}) {
  const { erro, guardado } = await searchParams
  const { supabase, user } = await getAuthContext()

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

  const { data: pedidosData } = await supabase
    .from('matriculas')
    .select(
      'id, criado_em, mensagem, alunos(nome, encarregado:profiles!alunos_encarregado_id_fkey(telefone)), instrumentos(nome), disponibilidades_selecionadas(horario_id, horarios(dia_semana, hora_inicio, hora_fim))'
    )
    .eq('professor_id', user.id)
    .eq('estado', 'a_escolher')
    .order('criado_em')
  const pedidos = (pedidosData ?? []) as unknown as Pedido[]

  // Para o professor poder propor uma hora à escolha dele, o ecrã precisa
  // de saber três coisas: que vagas ele tem, quais já têm aluno, e se
  // este pedido já tem uma proposta à espera de resposta.
  const [{ data: horariosData }, { data: ocupadosData }, { data: propostasData }] =
    await Promise.all([
      supabase
        .from('horarios')
        .select('id, dia_semana, hora_inicio, hora_fim')
        .eq('professor_id', user.id),
      supabase
        .from('matriculas')
        .select('horario_final_id')
        .eq('professor_id', user.id)
        .eq('estado', 'confirmado')
        .not('horario_final_id', 'is', null),
      supabase
        .from('propostas_horario')
        .select(
          'id, matricula_id, mensagem, novo:horarios!propostas_horario_horario_novo_id_fkey(dia_semana, hora_inicio, hora_fim)'
        )
        .eq('professor_id', user.id)
        .eq('estado', 'pendente'),
    ])

  const ocupados = new Set(
    ((ocupadosData ?? []) as { horario_final_id: number | null }[])
      .map((m) => m.horario_final_id)
      .filter((id): id is number => id !== null)
  )

  // Ordenado pela semana e não por ordem alfabética: "Quarta, Quinta,
  // Segunda, Sexta, Sábado, Terça" é o que sai de ordenar os nomes, e
  // ninguém procura um horário assim.
  const horariosLivres = ((horariosData ?? []) as {
    id: number
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
  }[])
    .filter((h) => !ocupados.has(h.id))
    .sort(
      (a, b) =>
        DIAS_SEMANA.indexOf(a.dia_semana) - DIAS_SEMANA.indexOf(b.dia_semana) ||
        a.hora_inicio.localeCompare(b.hora_inicio)
    )

  const propostaPorMatricula = new Map(
    ((propostasData ?? []) as unknown as {
      id: number
      matricula_id: number
      mensagem: string | null
      novo: { dia_semana: DiaSemana; hora_inicio: string; hora_fim: string } | null
    }[]).map((p) => [p.matricula_id, p])
  )

  function idadePedido(criadoEm: string) {
    const dias = Math.max(0, Math.floor((agoraNaEscola().getTime() - new Date(criadoEm).getTime()) / 86_400_000))
    return dias === 0 ? 'Hoje' : dias === 1 ? 'Há 1 dia' : `Há ${dias} dias`
  }

  return (
    <main id="conteudo-principal" className="partitura-pagina pedidos-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">←</Link>
          <div><p className="partitura-sobretitulo">Fila de decisão</p><h1>Pedidos</h1><p>{pedidos.length > 0 ? `${pedidos.length} ${pedidos.length === 1 ? 'pedido aguarda' : 'pedidos aguardam'} resposta.` : 'Está tudo em dia.'}</p></div>
        </header>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}
        {guardado && <MensagemInfo>{decodeURIComponent(guardado)}</MensagemInfo>}

        <section className="pedidos-fila" aria-label="Pedidos pendentes">
          {pedidos.length === 0 && (
            <EmptyState
              titulo="Não há pedidos pendentes"
              descricao="Está tudo em dia — os novos pedidos de aula aparecem aqui."
            />
          )}
          {pedidos.map((pedido, indice) => (
            <article key={pedido.id} className="pedido-registo">
              <header>
                <span className="pedido-indice">{String(indice + 1).padStart(2, '0')}</span>
                <div><h2>{pedido.alunos?.nome}</h2><p>{pedido.instrumentos?.nome}</p></div>
                <time dateTime={pedido.criado_em}>{idadePedido(pedido.criado_em)}</time>
              </header>
              {pedido.alunos?.encarregado?.telefone && (
                <p className="pedido-contacto">
                  <a
                    href={`tel:${pedido.alunos!.encarregado!.telefone}`}
                    className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-4"
                  >
                    Ligar para{' '}
                    {pedido.alunos!.encarregado!.telefone}
                  </a>
                </p>
              )}
              {pedido.mensagem && (
                <blockquote>
                  “{pedido.mensagem}”
                </blockquote>
              )}
              {/* Sem horários indicados não há nada que confirmar, e o
                  cabeçalho sozinho deixava o professor a olhar para um
                  espaço em branco com um botão vermelho por baixo. O
                  assistente permite pedir só com mensagem — quando o
                  professor não tem vagas, é isso mesmo que a app sugere ao
                  encarregado —, por isso este caso é normal e merece ser
                  explicado em vez de parecer avaria. */}
              {pedido.disponibilidades_selecionadas.length === 0 ? (
                <div className="pedido-disponibilidade">
                  <p>Sem horários indicados</p>
                  <p className="pedido-disponibilidade-vazio">
                    {pedido.mensagem
                      ? 'O encarregado não escolheu horários e deixou a mensagem acima. Combina com ele e propõe a hora aqui em baixo.'
                      : 'O encarregado não escolheu horários nem deixou mensagem. Vale a pena contactá-lo antes de decidir.'}
                  </p>
                </div>
              ) : (
              <div className="pedido-disponibilidade">
                <p>Disponibilidade indicada</p>
                <div>
                {pedido.disponibilidades_selecionadas.map((d) => {
                  const label = `${d.horarios?.dia_semana}, ${d.horarios?.hora_inicio.slice(0, 5)}–${d.horarios?.hora_fim.slice(0, 5)}`
                  return (
                    <form key={d.horario_id} action={confirmarHorario}>
                      <input type="hidden" name="matriculaId" value={pedido.id} />
                      <input type="hidden" name="horarioId" value={d.horario_id} />
                      <SubmitButton
                        textoAGuardar="A confirmar…"
                        className="pedido-horario-botao"
                      >
                        Confirmar {label}
                      </SubmitButton>
                    </form>
                  )
                })}
                </div>
              </div>
              )}
              {/* Propor uma hora à escolha do professor. Vem depois das
                  que o encarregado indicou, e não antes: quando uma
                  delas serve, é essa a decisão mais rápida e não deve
                  ficar atrás de um formulário. */}
              {(() => {
                const proposta = propostaPorMatricula.get(pedido.id)
                if (proposta) {
                  return (
                    <div className="pedido-disponibilidade">
                      <p>Horário proposto por ti</p>
                      <p className="pedido-disponibilidade-vazio">
                        <strong>
                          {proposta.novo?.dia_semana}, {proposta.novo?.hora_inicio.slice(0, 5)}–
                          {proposta.novo?.hora_fim.slice(0, 5)}
                        </strong>{' '}
                        — à espera da resposta do encarregado. A hora não fica reservada até ele
                        aceitar.
                      </p>
                    </div>
                  )
                }
                return null
              })()}

              <details className="pedido-propor">
                <summary>
                  {propostaPorMatricula.has(pedido.id)
                    ? 'Propor outra hora'
                    : 'Propor outro horário'}
                </summary>
                <form action={proporHorarioNoPedido} className="pedido-propor-corpo">
                  <input type="hidden" name="matriculaId" value={pedido.id} />

                  <p className="pedido-propor-ajuda">
                    Combinaste outra hora com o encarregado? Escolhe uma das tuas vagas livres, ou
                    escreve a hora nova. Ele recebe um aviso e tem de aceitar antes de a aula ficar
                    marcada.
                  </p>

                  {horariosLivres.length > 0 && (
                    <fieldset className="pedido-propor-vagas">
                      <legend>As tuas vagas livres</legend>
                      {horariosLivres.map((h) => (
                        <label key={h.id}>
                          <input type="radio" name="horarioId" value={h.id} />
                          <span>
                            {h.dia_semana}, {h.hora_inicio.slice(0, 5)}–{h.hora_fim.slice(0, 5)}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  )}

                  <fieldset className="pedido-propor-nova">
                    <legend>
                      {horariosLivres.length > 0 ? 'Ou uma hora nova' : 'Escreve a hora'}
                    </legend>
                    <div>
                      <label>
                        <span>Dia</span>
                        <select name="diaSemana" defaultValue="">
                          <option value="">—</option>
                          {DIAS_SEMANA.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Início</span>
                        <input type="time" name="horaInicio" step={300} />
                      </label>
                      <label>
                        <span>Fim</span>
                        <input type="time" name="horaFim" step={300} />
                      </label>
                    </div>
                    <p className="pedido-propor-ajuda">
                      Se esta hora ainda não existir nos teus horários, fica criada como mais uma
                      vaga tua.
                    </p>
                  </fieldset>

                  <label className="pedido-propor-mensagem">
                    <span>Mensagem (opcional)</span>
                    <textarea
                      name="mensagem"
                      rows={2}
                      maxLength={500}
                      placeholder="Como combinámos ao telefone…"
                    />
                  </label>

                  <SubmitButton textoAGuardar="A propor…" className="pedido-horario-botao">
                    Propor este horário
                  </SubmitButton>
                </form>
              </details>

              <footer>
                <BotaoAcaoDestruir
                  label="Recusar"
                  variante="editorial"
                  mensagem={`Recusar o pedido de ${pedido.alunos?.nome} (${pedido.instrumentos?.nome})? O pedido será apagado.`}
                  action={recusarPedido}
                >
                  <input type="hidden" name="matriculaId" value={pedido.id} />
                </BotaoAcaoDestruir>
              </footer>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
