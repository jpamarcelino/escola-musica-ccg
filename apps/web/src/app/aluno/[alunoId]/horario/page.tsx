import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  cancelarPedido,
  desmarcarAula,
} from '@/lib/actions/aluno'
import { formatarSala, formatarHora, proximaAulaPorAcontecer, formatarDataEscolar, hojeISO, type DiaSemana } from '@ccg/core'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'

// Onde está a reposição de cada aula desmarcada, dito para quem espera
// por ela. "sem_pedido" não entra: nesse caso o que se mostra é o botão
// de pedir, e não uma frase sobre o estado.
const ROTULO_REPOSICAO: Record<string, string> = {
  por_repor: 'O professor vai marcar a reposição.',
  pendente: 'Pedido de reposição enviado. À espera de resposta.',
  agendada: 'Reposição marcada.',
  nao_possivel: 'Não foi possível repor esta aula.',
  expirada: 'O pedido de reposição expirou. Fala com o professor.',
}
import { EmptyState } from '@/components/empty-state'
import type { MatriculaEstado } from '@ccg/types'

type Matricula = {
  id: number
  estado: MatriculaEstado
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
  horarios: {
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

export default async function ConsultarHorarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ alunoId: string }>
  searchParams: Promise<{ erro?: string; desmarcada?: string; pedido?: string }>
}) {
  const { alunoId } = await params
  const { erro, desmarcada, pedido } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: aluno } = await supabase
    .from('alunos')
    .select('nome')
    .eq('id', alunoId)
    .eq('encarregado_id', user.id)
    .maybeSingle()

  if (!aluno) {
    notFound()
  }

  const { data } = await supabase
    .from('matriculas')
    .select(
      'id, estado, instrumentos(nome), profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
    )
    .eq('aluno_id', alunoId)
    .in('estado', ['a_escolher', 'confirmado'])
    .order('criado_em', { ascending: false })
  const matriculas = (data ?? []) as unknown as Matricula[]

  // As aulas que já foram desmarcadas. A grelha é semanal e não há linha
  // por aula, por isso é esta lista que diz quais das ocorrências futuras
  // já não vão acontecer.
  const { data: desmarcadasData } = await supabase
    .from('aulas_desmarcadas')
    .select('id, matricula_id, data, hora_inicio, hora_fim, instrumento_nome, origem, reposicao_estado')
    .eq('aluno_id', alunoId)
    .gte('data', hojeISO())
    .order('data')
  const desmarcadas = desmarcadasData ?? []
  const porMatricula = new Map<number, Set<string>>()
  for (const d of desmarcadas) {
    const atual = porMatricula.get(d.matricula_id) ?? new Set<string>()
    atual.add(d.data)
    porMatricula.set(d.matricula_id, atual)
  }

  // As reposições já marcadas. São aulas avulsas, fora da grelha semanal,
  // e por isso vivem em tabela própria — mas na agenda do aluno aparecem
  // ao lado das outras, identificadas.
  const { data: reposicoesData } = await supabase
    .from('reposicoes')
    .select('id, data, hora_inicio, hora_fim, instrumento_nome')
    .eq('estado', 'confirmada')
    .eq('aluno_id', alunoId)
    .gte('data', hojeISO())
    .order('data')
  const reposicoes = reposicoesData ?? []

  const pendentes = matriculas.filter((m) => m.estado === 'a_escolher')
  const confirmadas = matriculas
    .filter((m) => m.estado === 'confirmado' && m.horarios)
    .map((m) => ({
      ...m,
      proxima: proximaAulaPorAcontecer(
        m.horarios!.dia_semana,
        m.horarios!.hora_inicio,
        m.horarios!.hora_fim,
        porMatricula.get(m.id) ?? new Set<string>()
      ),
    }))
    .filter((m): m is typeof m & { proxima: string } => m.proxima !== null)
    .sort((a, b) =>
      a.proxima === b.proxima
        ? a.horarios!.hora_inicio.localeCompare(b.horarios!.hora_inicio)
        : a.proxima.localeCompare(b.proxima)
    )

  return (
    <main id="conteudo-principal" className="pinterest-horario">
      <div className="pinterest-horario-folha">
        <header className="pinterest-horario-cabecalho">
          <Link href={`/aluno/${alunoId}`} className="pinterest-horario-voltar" aria-label={`Voltar à área de ${aluno.nome}`}>
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
          {/* proximaOcorrenciaDeAula devolve ISO ("2026-08-17"), que é o
              formato certo para ordenar e comparar mas nunca para mostrar.
              Estava a chegar ao ecrã tal e qual — e este é o destino do
              separador "Agenda", não um canto escondido. */}
          <div><h1>Agenda de {aluno.nome.split(' ')[0]}</h1><p>{confirmadas[0] ? `A próxima aula é ${formatarDataEscolar(confirmadas[0].proxima, { weekday: 'long', day: 'numeric', month: 'long' })}, às ${formatarHora(confirmadas[0].horarios!.hora_inicio)}.` : 'Ainda não há aulas confirmadas.'}</p></div>
        </header>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}
        {desmarcada && <MensagemInfo>Aula desmarcada. O professor foi avisado.</MensagemInfo>}
        {pedido && (
          <MensagemInfo>
            Pedido enviado. O professor responde assim que puder.
          </MensagemInfo>
        )}

        {/* A proposta vem primeiro, antes das aulas. É a única coisa
            nesta página que está à espera de uma decisão — o resto é
            informação. Aceitar e recusar têm o mesmo peso: recusar é uma
            resposta legítima, e a aula fica onde está. */}
        {pendentes.length > 0 && (
          <section className="aluno-pedidos-curso">
            <header><h2>Pedidos em curso</h2><span>{pendentes.length}</span></header>
            <div>
              {pendentes.map((m) => (
                <details key={m.id}>
                  <summary><span><strong>{m.instrumentos?.nome}</strong><small>{m.profiles?.nome} · A aguardar horário</small></span><i aria-hidden="true">+</i></summary>
                  <div>
                    <p>O professor irá escolher uma das disponibilidades indicadas.</p>
                    <BotaoAcaoDestruir label="Cancelar pedido" variante="editorial" mensagem={`Tens a certeza que queres cancelar o pedido de ${m.instrumentos?.nome} com ${m.profiles?.nome}?`} action={cancelarPedido}>
                      <input type="hidden" name="matriculaId" value={m.id} />
                    </BotaoAcaoDestruir>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* As aulas que já não vão acontecer continuam na lista, marcadas.
            Tirá-las por completo escondia justamente a informação que
            interessa: a agenda ficava igual à de antes de desmarcar, e a
            pessoa não tinha como confirmar que o pedido tinha resultado. */}
        {desmarcadas.length > 0 && (
          <section className="aluno-proximas-aulas">
            <header><h2>Aulas desmarcadas</h2></header>
            <div className="partitura-linha-tempo">
              {desmarcadas.map((d) => (
                <div key={d.id} className="aluno-aula-registo aluno-aula-desmarcada">
                  <p>
                    <strong>{d.instrumento_nome}</strong>
                    <span className="aluno-etiqueta-desmarcada">Desmarcada</span>
                  </p>
                  <p>
                    {formatarDataEscolar(d.data, { weekday: 'long', day: 'numeric', month: 'long' })}
                    , {formatarHora(d.hora_inicio)}–{formatarHora(d.hora_fim)}
                  </p>
                  <p>{ROTULO_REPOSICAO[d.reposicao_estado] ?? ''}</p>
                  {/* Só faz sentido oferecer o pedido a quem ainda o pode
                      fazer: o professor que desmarca fica com a reposição
                      do lado dele. */}
                  {d.origem === 'aluno' && d.reposicao_estado === 'sem_pedido' && (
                    <LigacaoTerciaria href={`/aluno/${alunoId}/reposicao/${d.id}`}>
                      Pedir reposição
                    </LigacaoTerciaria>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="aluno-proximas-aulas">
          <header><h2>Próximas aulas</h2></header>
          {confirmadas.length === 0 ? (
            <EmptyState
              titulo="Ainda não há aulas confirmadas"
              descricao="Quando um professor confirmar o horário, a próxima aula aparece aqui."
            />
          ) : (
            /* Deixou de ser um acordeão. Desmarcar era a única coisa
               lá dentro, e escondê-la atrás de um toque não a tornava
               menos usada — só a tornava menos encontrável. Agora está
               por baixo da aula, à vista, e continua atrás da mesma
               confirmação.

               Cancelar a MATRÍCULA continua fora daqui: esta página é
               para consultar quando é a próxima aula, e vive em
               /dashboard/conta/avancado com as outras saídas. */
            <div className="pinterest-horario-aulas">
              {confirmadas.map((m) => {
                const horario = m.horarios!
                return (
                  <article key={m.id} className="pinterest-horario-aula">
                    <div className="pinterest-horario-aula-topo">
                      <time>{formatarHora(horario.hora_inicio)}</time>
                      <div>
                        <small>
                          {formatarDataEscolar(m.proxima, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </small>
                        <strong>{m.instrumentos?.nome}</strong>
                        <span>
                          {m.profiles?.nome}
                          {formatarSala(horario.salas) && ` · ${formatarSala(horario.salas)}`}
                        </span>
                      </div>
                    </div>
                    <div className="pinterest-horario-aula-fundo">
                      <p>
                        {formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)} · aula
                        semanal
                      </p>
                      {/* Desmarcar age sobre UMA ocorrência — a próxima —
                          e não sobre a matrícula. Daí a data ir no
                          formulário: sem ela, a base de dados não saberia
                          de que aula se fala. */}
                      <BotaoAcaoDestruir
                        label="Desmarcar esta aula"
                        variante="editorial"
                        titulo="Desmarcar a aula de que dia?"
                        mensagem={`Fica desmarcada só a aula de ${formatarDataEscolar(m.proxima, { weekday: 'long', day: 'numeric', month: 'long' })}. As seguintes mantêm-se.\n\nO professor é avisado. Só é possível até 24 horas antes.`}
                        action={desmarcarAula}
                      >
                        <input type="hidden" name="matriculaId" value={m.id} />
                        <input type="hidden" name="data" value={m.proxima} />
                        <input type="hidden" name="alunoId" value={alunoId} />
                      </BotaoAcaoDestruir>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {reposicoes.length > 0 && (
          <section className="aluno-proximas-aulas">
            <header><h2>Reposições marcadas</h2></header>
            <div className="partitura-linha-tempo">
              {reposicoes.map((r) => (
                <div key={r.id} className="aluno-aula-registo aluno-aula-reposicao">
                  <p>
                    <strong>{r.instrumento_nome}</strong> · Reposição
                  </p>
                  <p>
                    {formatarDataEscolar(r.data, { weekday: 'long', day: 'numeric', month: 'long' })}
                    , {formatarHora(r.hora_inicio)}–{formatarHora(r.hora_fim)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
