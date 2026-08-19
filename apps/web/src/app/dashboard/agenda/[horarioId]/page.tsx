import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
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
    <main id="conteudo-principal" className="partitura-pagina detalhe-aula-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard/agenda" className="partitura-voltar" aria-label="Voltar à agenda">←</Link>
          <div><p className="partitura-sobretitulo">Aula semanal</p><h1>{horario.dia_semana}</h1><p>{formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}{formatarSala(horario.salas) && ` · ${formatarSala(horario.salas)}`}</p></div>
        </header>

        {erro && <MensagemErro>{erro}</MensagemErro>}
        {desmarcada && <MensagemInfo>Aula desmarcada. O aluno foi avisado.</MensagemInfo>}

        {alunos.length === 0 ? (
          <EmptyState titulo="Não há alunos confirmados neste horário" />
        ) : (
          <section className="detalhe-aula-alunos" aria-labelledby="alunos-aula-titulo">
            <header><p className="partitura-indice">01</p><h2 id="alunos-aula-titulo">Alunos nesta aula</h2><span>{alunos.length}</span></header>
            <div>
            {alunos.map((aluno) => {
              const proxima = proximaDe(aluno.id)
              return (
                <div key={aluno.id} className="detalhe-aula-aluno">
                  <Link href={`/dashboard/agenda/${horarioId}/${aluno.id}`}>
                    <strong>{aluno.alunos?.nome}</strong>
                    <span>{aluno.instrumentos?.nome}</span>
                    <i aria-hidden="true">→</i>
                  </Link>
                  {podeDesmarcar && proxima && (
                    <BotaoAcaoDestruir
                      label="Desmarcar esta aula"
                      variante="editorial"
                      titulo="Desmarcar a aula de que dia?"
                      mensagem={`Fica desmarcada só a aula de ${formatarDataEscolar(proxima, { weekday: 'long', day: 'numeric', month: 'long' })}, de ${aluno.alunos?.nome}. As seguintes mantêm-se.\n\nO aluno é avisado de que vai haver reposição.`}
                      action={desmarcarAulaProfessor}
                    >
                      <input type="hidden" name="matriculaId" value={aluno.id} />
                      <input type="hidden" name="data" value={proxima} />
                      <input type="hidden" name="horarioId" value={horarioId} />
                    </BotaoAcaoDestruir>
                  )}
                </div>
              )
            })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
