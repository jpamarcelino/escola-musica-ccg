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
    <main id="conteudo-principal" className="partitura-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Aulas de reposição</p>
            <h1>Horários de reposição</h1>
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

        <section className="space-y-4 pt-6">
          <h2 className="font-semibold">Abrir uma vaga</h2>
          <p className="text-sm text-foreground/60">
            Uma data e uma hora, uma vez só. Os alunos com aulas por repor passam a poder
            escolhê-la — a vaga só fica ocupada quando aceitares o pedido.
          </p>
          <form action={criarHorarioReposicao} className="space-y-3">
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
            <div className="flex gap-3">
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
              className="flex h-[52px] w-full items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-raised)] disabled:opacity-50 motion-reduce:transition-none sm:w-auto sm:px-7"
            >
              Abrir vaga
            </SubmitButton>
          </form>
        </section>

        <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
          <h2 className="font-semibold">Vagas por preencher</h2>
          {disponiveis.length === 0 ? (
            <EmptyState titulo="Nenhuma vaga aberta" />
          ) : (
            <div className="space-y-3">
              {disponiveis.map((v) => (
                <div key={v.id} className="lista-item space-y-2">
                  <p className="lista-item-titulo">
                    {formatarDataEscolar(v.data, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="lista-item-sub">
                    {formatarHora(v.hora_inicio)}–{formatarHora(v.hora_fim)}
                  </p>
                  <BotaoAcaoDestruir
                    label="Retirar vaga"
                    variante="editorial"
                    titulo="Retirar esta vaga?"
                    mensagem={`Deixa de estar disponível para os alunos escolherem.`}
                    action={apagarHorarioReposicao}
                  >
                    <input type="hidden" name="horarioId" value={v.id} />
                  </BotaoAcaoDestruir>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* As ocupadas ficam à vista, e sem botão para as retirar: por trás
            de cada uma há uma reposição marcada e um aluno avisado. */}
        {ocupadas.length > 0 && (
          <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
            <h2 className="font-semibold">Já com aluno</h2>
            <div className="space-y-3">
              {ocupadas.map((v) => (
                <div key={v.id} className="lista-item">
                  <p className="lista-item-titulo">
                    {formatarDataEscolar(v.data, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="lista-item-sub">
                    {formatarHora(v.hora_inicio)}–{formatarHora(v.hora_fim)} · ocupada
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
