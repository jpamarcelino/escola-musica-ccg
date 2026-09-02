import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/empty-state'
import { formatarHora, formatarSala, formatarDataEscolar, hojeISO, proximaAulaPorAcontecer, type DiaSemana } from '@ccg/core'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { desmarcarAulaProfessor } from '@/lib/actions/professor'

type Aluno = {
  id: number
  instrumentos: { nome: string } | null
  alunos: { nome: string } | null
}

export default async function AgendaHorarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ horarioId: string }>
  searchParams: Promise<{ erro?: string; desmarcada?: string }>
}) {
  const { horarioId } = await params
  const { erro, desmarcada } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('perfis_escola')
    .select('tipo, programa')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: horarioData } = await supabase
    .from('horarios')
    .select('dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero)')
    .eq('id', Number(horarioId))
    .eq('professor_id', user.id)
    .maybeSingle()
  const horario = horarioData as unknown as {
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null

  if (!horario) {
    notFound()
  }

  const { data: alunosData } = await supabase
    .from('matriculas')
    .select('id, instrumentos(nome), alunos(nome)')
    .eq('horario_final_id', Number(horarioId))
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .order('criado_em')
  const alunos = (alunosData ?? []) as unknown as Aluno[]

  // A aula é sempre uma ocorrência com data, nunca "o horário". Para cada
  // aluno, a próxima que ainda vai acontecer — saltando as que já foram
  // desmarcadas. É sobre essa que o botão age.
  const { data: desmarcadasData } = await supabase
    .from('aulas_desmarcadas')
    .select('matricula_id, data')
    .eq('professor_id', user.id)
    .gte('data', hojeISO())
  const canceladas = new Map<number, Set<string>>()
  for (const d of desmarcadasData ?? []) {
    const atual = canceladas.get(d.matricula_id) ?? new Set<string>()
    atual.add(d.data)
    canceladas.set(d.matricula_id, atual)
  }

  // Só música tem reposições — e desmarcar uma aula avulsa só faz sentido
  // onde há reposição a seguir.
  const podeDesmarcar = profile?.programa === 'musica'

  const proximaDe = (matriculaId: number) =>
    proximaAulaPorAcontecer(
      horario.dia_semana,
      horario.hora_inicio,
      horario.hora_fim,
      canceladas.get(matriculaId) ?? new Set<string>()
    )

  return (
    <main id="conteudo-principal" className="pinterest-detalhe">
      <div className="pinterest-detalhe-folha">
        <header className="pinterest-detalhe-cabecalho">
          <Link href="/dashboard/agenda" className="pinterest-detalhe-voltar" aria-label="Voltar à agenda">
            <ChevronLeft size={23} aria-hidden="true" />
          </Link>
          <div>
            <h1>{horario.dia_semana}</h1>
            <p>Aula semanal</p>
          </div>
        </header>

        {/* A hora e a sala num cartão próprio, e não numa linha do
            cabeçalho: é o que o professor confirma antes de agir sobre
            alguém desta lista. */}
        <div className="pinterest-detalhe-contexto">
          <Clock size={20} aria-hidden="true" />
          <div>
            <strong>
              {formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}
            </strong>
            <span>{formatarSala(horario.salas) || 'Sala por definir'}</span>
          </div>
        </div>

        {(erro || desmarcada) && (
          <div className="pinterest-detalhe-mensagem">
            {erro && <MensagemErro>{erro}</MensagemErro>}
            {desmarcada && <MensagemInfo>Aula desmarcada. O aluno foi avisado.</MensagemInfo>}
          </div>
        )}

        {alunos.length === 0 ? (
          <EmptyState
            titulo="Não há alunos confirmados neste horário"
            descricao="Assim que confirmares um pedido para esta hora, o aluno aparece aqui."
          />
        ) : (
          <section className="pinterest-detalhe-seccao" aria-labelledby="alunos-aula-titulo">
            <h2 id="alunos-aula-titulo">
              Quem vem<b>{alunos.length}</b>
            </h2>
            <div className="pinterest-detalhe-lista">
              {alunos.map((aluno) => {
                const proxima = proximaDe(aluno.id)
                const nome = aluno.alunos?.nome ?? ''
                return (
                  <article key={aluno.id} className="pinterest-detalhe-aluno">
                    <Link href={`/dashboard/meus-alunos/${aluno.id}`}>
                      <span className="pinterest-detalhe-inicial" aria-hidden="true">
                        {nome.trim().charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <strong>{nome}</strong>
                        <small>{aluno.instrumentos?.nome}</small>
                      </span>
                      <ChevronRight size={19} aria-hidden="true" />
                    </Link>
                    {/* A data da próxima aula sai da confirmação para o
                        cartão: dizer de que dia se trata só depois do
                        toque obrigava a abrir o diálogo para saber. */}
                    {podeDesmarcar && proxima && (
                      <div className="pinterest-detalhe-desmarcar">
                        <p>
                          Próxima a{' '}
                          {formatarDataEscolar(proxima, { day: 'numeric', month: 'long' })}
                        </p>
                        <BotaoAcaoDestruir
                          label="Desmarcar"
                          variante="editorial"
                          titulo="Desmarcar a aula de que dia?"
                          mensagem={`Fica desmarcada só a aula de ${formatarDataEscolar(proxima, { weekday: 'long', day: 'numeric', month: 'long' })}, de ${nome}. As seguintes mantêm-se.\n\nO aluno é avisado de que vai haver reposição.`}
                          action={desmarcarAulaProfessor}
                        >
                          <input type="hidden" name="matriculaId" value={aluno.id} />
                          <input type="hidden" name="data" value={proxima} />
                          <input type="hidden" name="horarioId" value={horarioId} />
                        </BotaoAcaoDestruir>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
