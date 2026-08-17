import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { cancelarPedido, cancelarMatricula } from '@/lib/actions/aluno'
import { formatarSala, formatarHora, proximaOcorrenciaDeAula, formatarDataEscolar, type DiaSemana } from '@ccg/core'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
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
}: {
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params

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

  const pendentes = matriculas.filter((m) => m.estado === 'a_escolher')
  const confirmadas = matriculas
    .filter((m) => m.estado === 'confirmado' && m.horarios)
    .map((m) => ({
      ...m,
      proxima: proximaOcorrenciaDeAula(
        m.horarios!.dia_semana,
        m.horarios!.hora_inicio,
        m.horarios!.hora_fim
      ),
    }))
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
                    <div><p>{formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)} · aula semanal</p><BotaoAcaoDestruir label="Cancelar matrícula" variante="editorial" mensagem={`Tens a certeza que queres cancelar a matrícula de ${m.instrumentos?.nome} com ${m.profiles?.nome}? Esta ação é irreversível.`} action={cancelarMatricula}><input type="hidden" name="matriculaId" value={m.id} /></BotaoAcaoDestruir></div>
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
