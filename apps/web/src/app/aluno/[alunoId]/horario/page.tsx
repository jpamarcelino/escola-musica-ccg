import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cancelarPedido, desmarcarAula } from '@/lib/actions/aluno'
import { formatarSala, formatarHora, proximaAulaPorAcontecer, formatarDataEscolar, hojeISO, type DiaSemana } from '@ccg/core'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
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
  searchParams: Promise<{ erro?: string; desmarcada?: string }>
}) {
  const { alunoId } = await params
  const { erro, desmarcada } = await searchParams

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
    .select('matricula_id, data')
    .eq('aluno_id', alunoId)
    .gte('data', hojeISO())
  const porMatricula = new Map<number, Set<string>>()
  for (const d of desmarcadasData ?? []) {
    const atual = porMatricula.get(d.matricula_id) ?? new Set<string>()
    atual.add(d.data)
    porMatricula.set(d.matricula_id, atual)
  }

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
    <main id="conteudo-principal" className="partitura-pagina aluno-agenda-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href={`/aluno/${alunoId}`} className="partitura-voltar" aria-label={`Voltar à área de ${aluno.nome}`}>←</Link>
          {/* proximaOcorrenciaDeAula devolve ISO ("2026-08-17"), que é o
              formato certo para ordenar e comparar mas nunca para mostrar.
              Estava a chegar ao ecrã tal e qual — e este é o destino do
              separador "Agenda", não um canto escondido. */}
          <div><p className="partitura-sobretitulo">Caderno de {aluno.nome}</p><h1>Agenda</h1><p>{confirmadas[0] ? `A próxima aula é ${formatarDataEscolar(confirmadas[0].proxima, { weekday: 'long', day: 'numeric', month: 'long' })}, às ${formatarHora(confirmadas[0].horarios!.hora_inicio)}.` : 'Ainda não há aulas confirmadas.'}</p></div>
        </header>

        {erro && <MensagemErro>{erro}</MensagemErro>}
        {desmarcada && (
          <MensagemInfo>Aula desmarcada. O professor foi avisado.</MensagemInfo>
        )}

        {pendentes.length > 0 && (
          <section className="aluno-pedidos-curso">
            <header><p className="partitura-indice">01</p><h2>Pedidos em curso</h2><span>{pendentes.length}</span></header>
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

        <section className="aluno-proximas-aulas">
          <header><p className="partitura-indice">02</p><h2>Próximas aulas</h2></header>
          {confirmadas.length === 0 ? (
            <EmptyState
              titulo="Ainda não há aulas confirmadas"
              descricao="Quando um professor confirmar o horário, a próxima aula aparece aqui."
            />
          ) : (
            <div className="partitura-linha-tempo">
              {confirmadas.map((m) => {
                const horario = m.horarios!
                return (
                  <details key={m.id} className="aluno-aula-registo">
                    <summary><time>{formatarHora(horario.hora_inicio)}</time><span className="partitura-marca" aria-hidden="true" /><span><small>{formatarDataEscolar(m.proxima, { weekday: 'long', day: 'numeric', month: 'long' })}</small><strong>{m.instrumentos?.nome}</strong><b>{m.profiles?.nome}{formatarSala(horario.salas) && ` · ${formatarSala(horario.salas)}`}</b></span><i aria-hidden="true">+</i></summary>
                    {/* Cancelar a matrícula estava aqui, debaixo do horário de cada
                          aula. Esta página é para consultar quando é a próxima
                          aula — não é onde se desfaz uma inscrição, e a
                          proximidade das duas coisas fazia com que abrir o
                          horário mostrasse sempre um botão vermelho. Mudou-se
                          para /dashboard/conta/avancado, com as outras saídas. */}
                    <div>
                      <p>{formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)} · aula semanal</p>
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
                  </details>
                )
              })}
            </div>
          )}
        </section>

        <Link href={`/aluno/${alunoId}/pedido`} className="aluno-pedir-mais"><span><strong>Pedir outra aula</strong><small>Escolher disciplina, professor e disponibilidade</small></span><i aria-hidden="true">→</i></Link>
      </div>
    </main>
  )
}
