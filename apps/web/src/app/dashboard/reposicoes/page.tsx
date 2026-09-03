import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { criarHorarioReposicao, apagarHorarioReposicao } from '@/lib/actions/professor'
import { SubmitButton } from '@/components/submit-button'
import { Rotulo, classesCampo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { EmptyState } from '@/components/empty-state'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { formatarDataEscolar, formatarHora, hojeISO } from '@ccg/core'
import { VoltarAtras } from '@/components/voltar-atras'
import { CalendarCheck2, CalendarPlus, ChevronLeft, ChevronRight, Clock3, Inbox } from 'lucide-react'

type Vaga = {
  id: number
  data: string
  hora_inicio: string
  hora_fim: string
  estado: string
}

// Horários de reposição: vagas pontuais que o professor abre para repor
// aulas desmarcadas.
//
// Não são `horarios`. A grelha semanal repete-se toda a semana e é o que
// define a matrícula de um aluno; isto é uma data, uma hora, uma vez só.
// Misturá-las obrigaria cada consulta da agenda a saber distinguir as
// duas — e a agenda é o sítio da app com mais consultas.
//
// Nesta fase, cada vaga leva um aluno. Escolher uma vaga num pedido NÃO a
// reserva: ela só fica ocupada quando o professor aceita.
export default async function ReposicoesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; criada?: string }>
}) {
  const { erro, criada } = await searchParams
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }
  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }
  // Só música tem reposições. Um professor de dança que chegasse aqui
  // ficava com um formulário que não serve para nada.
  if (profile.programa !== 'musica') {
    redirect('/dashboard')
  }

  const [{ data: vagasData }, { count: porRepor }] = await Promise.all([
    supabase
      .from('horarios_reposicao')
      .select('id, data, hora_inicio, hora_fim, estado')
      .eq('professor_id', user.id)
      .gte('data', hojeISO())
      .order('data')
      .order('hora_inicio'),
    supabase
      .from('aulas_desmarcadas')
      .select('id', { count: 'exact', head: true })
      .eq('professor_id', user.id)
      .in('reposicao_estado', ['por_repor', 'pendente']),
  ])

  const vagas = (vagasData ?? []) as Vaga[]
  const disponiveis = vagas.filter((v) => v.estado === 'disponivel')
  const ocupadas = vagas.filter((v) => v.estado === 'ocupado')

  return (
    <main id="conteudo-principal" className="pinterest-reposicoes">
      <div className="pinterest-reposicoes-folha">
        <header className="pinterest-reposicoes-cabecalho">
          <VoltarAtras destino="/dashboard" className="pinterest-reposicoes-voltar" rotulo="Voltar ao início"><ChevronLeft size={24} aria-hidden="true" /></VoltarAtras>
          <div>
            <h1>Reposições</h1>
            <p>
              {disponiveis.length === 0
                ? 'Ainda não abriste nenhuma vaga.'
                : `${disponiveis.length} ${disponiveis.length === 1 ? 'vaga disponível' : 'vagas disponíveis'}.`}
              {(porRepor ?? 0) > 0 &&
                ` ${porRepor} ${porRepor === 1 ? 'aula espera' : 'aulas esperam'} reposição.`}
            </p>
          </div>
        </header>

        {erro && <MensagemErro>{erro}</MensagemErro>}
        {criada && <MensagemInfo>Vaga criada.</MensagemInfo>}

        <nav className="pinterest-reposicoes-entrada">
          <Link
            href="/dashboard/reposicoes/pedidos"
          >
            <span><Inbox size={19} aria-hidden="true" /></span>
            <div><strong>Pedidos e marcação manual</strong><small>{(porRepor ?? 0) > 0 ? `${porRepor} ${porRepor === 1 ? 'aula por tratar' : 'aulas por tratar'}` : 'Sem pedidos pendentes'}</small></div>
            <ChevronRight size={19} aria-hidden="true" />
          </Link>
        </nav>

        <section className="pinterest-reposicoes-criar">
          <header><span><CalendarPlus size={19} aria-hidden="true" /></span><div><h2>Abrir uma vaga</h2><p>Uma data, uma hora, uma vez só</p></div></header>
          <p className="text-sm text-foreground/60">
            Uma data e uma hora, uma vez só. Os alunos com aulas por repor passam a poder
            escolhê-la — a vaga só fica ocupada quando aceitares o pedido.
          </p>
          <form action={criarHorarioReposicao}>
            <div className="space-y-[6px]">
              <Rotulo htmlFor="reposicao-data">Dia</Rotulo>
              <input
                id="reposicao-data"
                name="data"
                type="date"
                required
                min={hojeISO()}
                className={classesCampo}
              />
            </div>
            <div className="pinterest-reposicoes-horas">
              <div className="flex-1 space-y-[6px]">
                <Rotulo htmlFor="reposicao-inicio">Começa</Rotulo>
                <input
                  id="reposicao-inicio"
                  name="horaInicio"
                  type="time"
                  required
                  className={classesCampo}
                />
              </div>
              <div className="flex-1 space-y-[6px]">
                <Rotulo htmlFor="reposicao-fim">Acaba</Rotulo>
                <input
                  id="reposicao-fim"
                  name="horaFim"
                  type="time"
                  required
                  className={classesCampo}
                />
              </div>
            </div>
            <SubmitButton
              textoAGuardar="A abrir…"
              className="pinterest-reposicoes-abrir"
            >
              Abrir vaga
            </SubmitButton>
          </form>
        </section>

        <section className="pinterest-reposicoes-lista" aria-labelledby="vagas-titulo">
          <header><span><Clock3 size={18} aria-hidden="true" /></span><div><h2 id="vagas-titulo">Vagas por preencher</h2><p>{disponiveis.length} {disponiveis.length === 1 ? 'disponível' : 'disponíveis'}</p></div></header>
          {disponiveis.length === 0 ? (
            <EmptyState titulo="Nenhuma vaga aberta" />
          ) : (
            <div className="pinterest-reposicoes-cartoes">
              {disponiveis.map((v) => (
                <article key={v.id}>
                  <p className="lista-item-titulo">
                    {formatarDataEscolar(v.data, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="lista-item-sub">
                    {formatarHora(v.hora_inicio)}–{formatarHora(v.hora_fim)}
                  </p>
                  <BotaoAcaoDestruir
                    label="Retirar vaga"
                    variante="bloco"
                    titulo="Retirar esta vaga?"
                    mensagem={`Deixa de estar disponível para os alunos escolherem.`}
                    action={apagarHorarioReposicao}
                  >
                    <input type="hidden" name="horarioId" value={v.id} />
                  </BotaoAcaoDestruir>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* As ocupadas ficam à vista, e sem botão para as retirar: por trás
            de cada uma há uma reposição marcada e um aluno avisado. */}
        {ocupadas.length > 0 && (
          <section className="pinterest-reposicoes-lista pinterest-reposicoes-ocupadas">
            <header><span><CalendarCheck2 size={18} aria-hidden="true" /></span><div><h2>Já com aluno</h2><p>{ocupadas.length} {ocupadas.length === 1 ? 'marcada' : 'marcadas'}</p></div></header>
            <div className="pinterest-reposicoes-cartoes">
              {ocupadas.map((v) => (
                <article key={v.id}>
                  <p className="lista-item-titulo">
                    {formatarDataEscolar(v.data, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="lista-item-sub">
                    {formatarHora(v.hora_inicio)}–{formatarHora(v.hora_fim)} · ocupada
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
