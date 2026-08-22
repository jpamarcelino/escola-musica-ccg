import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatarHora, formatarSala, agoraNaEscola, estadoTemporalAula, hojeISO, proximaAulaPorAcontecer, type DiaSemana } from '@ccg/core'
import { EmptyState } from '@/components/empty-state'
import { SubmitButton } from '@/components/submit-button'
import { classesCampo } from '@/components/campo-formulario'
import { formatarDataEscolar } from '@ccg/core'
import {
  aceitarPropostaHorario,
  recusarPropostaHorario,
  aceitarReposicaoProposta,
  recusarReposicaoProposta,
} from '@/lib/actions/aluno'

type AulaFamilia = {
  // Chave da linha. As aulas normais repetem-se, e a matrícula chega para
  // as distinguir dentro de um dia; uma reposição é uma linha própria e
  // traz o seu id com prefixo, para as duas famílias de ids não colidirem.
  chave: string
  alunoId: string
  alunoNome: string
  disciplina: string
  professor: string
  hora_inicio: string
  hora_fim: string
  sala: string | null
  data: string
  // Uma aula avulsa, fora da grelha semanal, marcada para repor outra.
  reposicao: boolean
}

function somarUmDia(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  const seguinte = new Date(ano, mes - 1, dia + 1)
  return `${seguinte.getFullYear()}-${String(seguinte.getMonth() + 1).padStart(2, '0')}-${String(seguinte.getDate()).padStart(2, '0')}`
}

function rotuloData(data: string): string {
  const hoje = hojeISO()
  if (data === hoje) return 'Hoje'
  if (data === somarUmDia(hoje)) return 'Amanhã'
  const [ano, mes, dia] = data.split('-').map(Number)
  const formatado = new Intl.DateTimeFormat('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(ano, mes - 1, dia))
  return formatado.charAt(0).toUpperCase() + formatado.slice(1)
}

function partesData(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number)
  const objeto = new Date(ano, mes - 1, dia)
  return {
    dia: String(dia).padStart(2, '0'),
    semana: new Intl.DateTimeFormat('pt-PT', { weekday: 'long' }).format(objeto),
    mes: new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(objeto),
  }
}

// Agenda conjunta de todos os alunos de uma Conta CCG.
//
// A agenda do professor responde a "o que tenho de dar hoje"; esta responde
// a "onde tenho de estar, e com quem" — por isso cada aula diz sempre de
// que aluno é. Numa família com dois filhos em disciplinas diferentes, sem
// o nome à frente a lista não se lê.
//
// Ao contrário da do professor, não há grelha semanal: uma família tem
// poucas aulas e a grelha, feita para comparar dezenas de horários, só
// acrescentava ruído.
export async function AgendaFamilia({
  supabase,
  userId,
  alunoFiltro,
}: {
  supabase: SupabaseClient
  userId: string
  alunoFiltro?: string
}) {
  const [
    { data: matriculasData },
    { data: alunosData },
    { data: desmarcadasData },
    { data: reposicoesData },
  ] = await Promise.all([
    supabase
      .from('matriculas')
      .select(
        'id, aluno_id, alunos!inner(nome, encarregado_id), instrumentos(nome), professor:profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
      )
      // O filtro por encarregado é o que garante que uma conta só vê as
      // suas aulas — a RLS de "matriculas" também o impõe, isto evita a
      // ida-e-volta extra para ir buscar primeiro a lista de ids.
      .eq('alunos.encarregado_id', userId)
      .eq('estado', 'confirmado')
      .not('horario_final_id', 'is', null),
    supabase
      .from('alunos')
      .select('id, nome')
      .eq('encarregado_id', userId)
      .order('criado_em'),
    // As ocorrências que já não vão acontecer. A grelha é semanal e não há
    // linha por aula, por isso é esta lista que as tira da agenda.
    supabase
      .from('aulas_desmarcadas')
      .select('matricula_id, data')
      .gte('data', hojeISO()),
    supabase
      .from('reposicoes')
      .select('id, aluno_id, data, hora_inicio, hora_fim, instrumento_nome')
      .eq('estado', 'confirmada')
      .gte('data', hojeISO())
      .order('data'),
  ])

  // O que espera decisão. Vive aqui, no topo da agenda da família, e não
  // dentro do perfil de cada aluno: uma pergunta escondida a dois cliques
  // de distância é uma pergunta sem resposta. A agenda é onde se vai ver
  // "o que temos", e é aqui que tem de aparecer "e isto, podes?".
  const idsDosAlunos = (alunosData ?? []).map((a) => a.id)
  const [{ data: propostasData }, { data: reposicoesPropostasData }] =
    idsDosAlunos.length > 0
      ? await Promise.all([
          supabase
            .from('propostas_horario')
            .select(
              'id, mensagem, aluno_id, novo:horarios!propostas_horario_horario_novo_id_fkey(dia_semana, hora_inicio, hora_fim), atual:horarios!propostas_horario_horario_atual_id_fkey(dia_semana, hora_inicio, hora_fim), matriculas(instrumentos(nome))'
            )
            .in('aluno_id', idsDosAlunos)
            .eq('estado', 'pendente'),
          supabase
            .from('reposicoes')
            .select('id, aluno_id, data, hora_inicio, hora_fim, instrumento_nome')
            .in('aluno_id', idsDosAlunos)
            .eq('estado', 'proposta')
            .order('data'),
        ])
      : [{ data: null }, { data: null }]

  const propostas = (propostasData ?? []) as unknown as {
    id: number
    mensagem: string | null
    aluno_id: string
    novo: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
    atual: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
    matriculas: { instrumentos: { nome: string } | null } | null
  }[]
  const reposicoesPropostas = (reposicoesPropostasData ?? []) as {
    id: number
    aluno_id: string
    data: string
    hora_inicio: string
    hora_fim: string
    instrumento_nome: string | null
  }[]

  const canceladas = new Map<number, Set<string>>()
  for (const d of desmarcadasData ?? []) {
    const atual = canceladas.get(d.matricula_id) ?? new Set<string>()
    atual.add(d.data)
    canceladas.set(d.matricula_id, atual)
  }

  const alunos = alunosData ?? []
  const nomePorAluno = new Map(alunos.map((a) => [a.id, a.nome]))
  const idsValidos = new Set(alunos.map((a) => a.id))
  // Um id de outra família não mostra nada — a lista já vem filtrada pelo
  // encarregado. Validar aqui serve só para o rótulo do estado vazio não
  // mostrar um nome que não existe.
  const filtroValido = alunoFiltro && idsValidos.has(alunoFiltro) ? alunoFiltro : null

  const linhas = (matriculasData ?? []) as unknown as {
    id: number
    aluno_id: string
    alunos: { nome: string } | null
    instrumentos: { nome: string } | null
    professor: { nome: string } | null
    horarios: {
      dia_semana: DiaSemana
      hora_inicio: string
      hora_fim: string
      salas: { nome: string; piso: number | null; numero: number | null } | null
    } | null
  }[]

  const aulasNormais: AulaFamilia[] = linhas
    .filter((m) => m.horarios)
    .filter((m) => !filtroValido || m.aluno_id === filtroValido)
    .map((m) => ({
      chave: `m${m.id}`,
      alunoId: m.aluno_id,
      alunoNome: m.alunos?.nome ?? '',
      disciplina: m.instrumentos?.nome ?? '',
      professor: m.professor?.nome ?? '',
      hora_inicio: m.horarios!.hora_inicio,
      hora_fim: m.horarios!.hora_fim,
      sala: formatarSala(m.horarios!.salas),
      data: proximaAulaPorAcontecer(
        m.horarios!.dia_semana,
        m.horarios!.hora_inicio,
        m.horarios!.hora_fim,
        canceladas.get(m.id) ?? new Set<string>()
      ),
      reposicao: false,
    }))
    .filter((a): a is typeof a & { data: string } => a.data !== null)

  // As reposições entram na mesma lista, e não numa secção à parte: quem
  // olha para a agenda quer saber onde tem de estar naquele dia, e uma
  // aula de reposição conta tanto como as outras. O que muda é a
  // etiqueta.
  const aulasReposicao: AulaFamilia[] = (reposicoesData ?? [])
    .filter((r) => !filtroValido || r.aluno_id === filtroValido)
    .map((r) => ({
      chave: `r${r.id}`,
      alunoId: r.aluno_id,
      alunoNome: nomePorAluno.get(r.aluno_id) ?? '',
      disciplina: r.instrumento_nome ?? '',
      professor: '',
      hora_inicio: r.hora_inicio,
      hora_fim: r.hora_fim,
      sala: null,
      data: r.data,
      reposicao: true,
    }))

  const aulas = [...aulasNormais, ...aulasReposicao].sort((a, b) =>
    a.data === b.data ? a.hora_inicio.localeCompare(b.hora_inicio) : a.data.localeCompare(b.data)
  )

  const porData = new Map<string, AulaFamilia[]>()
  for (const aula of aulas) {
    const lista = porData.get(aula.data) ?? []
    lista.push(aula)
    porData.set(aula.data, lista)
  }

  const agora = agoraNaEscola()

  return (
    <main id="conteudo-principal" className="partitura-pagina partitura-agenda">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Em família</p>
            <h1>Agenda</h1>
            {aulas[0] && <p>A próxima aula começa às {formatarHora(aulas[0].hora_inicio)}.</p>}
          </div>
        </header>

        {/* A agenda responde a "o que tenho esta semana"; o calendário
            responde a "há aula no dia 8?". São perguntas diferentes e é
            aqui que a segunda aparece a quem veio fazer a primeira. */}
        <nav className="pt-2">
          <Link href="/dashboard/calendario" className="agenda-ligacao-calendario">
            Calendário do ano letivo
          </Link>
        </nav>

        {/* Primeiro o que espera resposta, antes das aulas: é a única
            coisa desta página que não é informação, é uma decisão. */}
        {reposicoesPropostas.map((r) => (
          <section key={`rep-${r.id}`} className="proposta-horario">
            <h2>Reposição proposta</h2>
            <p>
              O professor marcou uma reposição
              {r.instrumento_nome ? ` de ${r.instrumento_nome}` : ''} para{' '}
              <strong>{nomePorAluno.get(r.aluno_id)}</strong>:{' '}
              <strong>
                {formatarDataEscolar(r.data, { weekday: 'long', day: 'numeric', month: 'long' })},{' '}
                {formatarHora(r.hora_inicio)}–{formatarHora(r.hora_fim)}
              </strong>
              .
            </p>
            <div className="proposta-horario-acoes">
              <form action={aceitarReposicaoProposta}>
                <input type="hidden" name="reposicaoId" value={r.id} />
                <input type="hidden" name="alunoId" value={r.aluno_id} />
                <SubmitButton
                  textoAGuardar="A aceitar…"
                  className="flex h-[48px] items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-azul-fundo)] px-6 text-[15px] font-semibold text-white disabled:opacity-50"
                >
                  Aceitar
                </SubmitButton>
              </form>
              <form action={recusarReposicaoProposta} className="proposta-horario-recusa">
                <input type="hidden" name="reposicaoId" value={r.id} />
                <input type="hidden" name="alunoId" value={r.aluno_id} />
                <label htmlFor={`resposta-${r.id}`} className="sr-only">
                  Quando é que podes?
                </label>
                <input
                  id={`resposta-${r.id}`}
                  name="resposta"
                  maxLength={500}
                  placeholder="Quando é que podes? (opcional)"
                  className={classesCampo}
                />
                <SubmitButton
                  textoAGuardar="A responder…"
                  className="flex h-[48px] items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] px-6 text-[15px] font-semibold text-[var(--color-ink)] disabled:opacity-50"
                >
                  Não posso
                </SubmitButton>
              </form>
            </div>
          </section>
        ))}

        {propostas.map((p) => (
          <section key={`hor-${p.id}`} className="proposta-horario">
            {/* Sem horário de origem é um pedido ainda por responder, e
                não uma mudança: o professor não pode nenhuma das horas
                escolhidas e propõe outra. Dizer "mudar de … para …" a
                quem ainda não tem aula nomeia um horário que nunca
                existiu. */}
            <h2>{p.atual ? 'Mudança de horário proposta' : 'Horário proposto pelo professor'}</h2>
            {p.atual ? (
              <p>
                O professor propõe mudar
                {p.matriculas?.instrumentos?.nome ? ` ${p.matriculas.instrumentos.nome}` : ''} de{' '}
                <strong>{nomePorAluno.get(p.aluno_id)}</strong> de{' '}
                <strong>
                  {p.atual.dia_semana}, {formatarHora(p.atual.hora_inicio)}–
                  {formatarHora(p.atual.hora_fim)}
                </strong>{' '}
                para{' '}
                <strong>
                  {p.novo?.dia_semana}, {p.novo && formatarHora(p.novo.hora_inicio)}–
                  {p.novo && formatarHora(p.novo.hora_fim)}
                </strong>
                .
              </p>
            ) : (
              <p>
                Para o pedido
                {p.matriculas?.instrumentos?.nome ? ` de ${p.matriculas.instrumentos.nome}` : ''} de{' '}
                <strong>{nomePorAluno.get(p.aluno_id)}</strong>, o professor propõe{' '}
                <strong>
                  {p.novo?.dia_semana}, {p.novo && formatarHora(p.novo.hora_inicio)}–
                  {p.novo && formatarHora(p.novo.hora_fim)}
                </strong>
                . Ao aceitares, a inscrição fica confirmada nesse horário.
              </p>
            )}
            {p.mensagem && <p className="proposta-horario-mensagem">“{p.mensagem}”</p>}
            <div className="proposta-horario-acoes">
              <form action={aceitarPropostaHorario}>
                <input type="hidden" name="propostaId" value={p.id} />
                <input type="hidden" name="alunoId" value={p.aluno_id} />
                <SubmitButton
                  textoAGuardar="A aceitar…"
                  className="flex h-[48px] items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-azul-fundo)] px-6 text-[15px] font-semibold text-white disabled:opacity-50"
                >
                  Aceitar
                </SubmitButton>
              </form>
              <form action={recusarPropostaHorario}>
                <input type="hidden" name="propostaId" value={p.id} />
                <input type="hidden" name="alunoId" value={p.aluno_id} />
                <SubmitButton
                  textoAGuardar="A responder…"
                  className="flex h-[48px] items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] px-6 text-[15px] font-semibold text-[var(--color-ink)] disabled:opacity-50"
                >
                  Não posso
                </SubmitButton>
              </form>
            </div>
          </section>
        ))}

        {/* Com um só aluno os separadores mostrariam sempre a mesma lista. */}
        {alunos.length > 1 && (
          <nav className="filtro-alunos" aria-label="Filtrar agenda por aluno">
            <Link href="/dashboard/agenda" aria-current={!filtroValido ? 'page' : undefined}>
              Todos
            </Link>
            {alunos.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/agenda?aluno=${a.id}`}
                aria-current={filtroValido === a.id ? 'page' : undefined}
              >
                {a.nome.split(' ')[0]}
              </Link>
            ))}
          </nav>
        )}

        {aulas.length === 0 ? (
          <EmptyState
            titulo="Ainda não há aulas confirmadas"
            descricao={
              alunos.length === 0
                ? 'Começa por adicionar quem vai às aulas.'
                : 'As aulas aparecem aqui assim que um professor confirmar um pedido.'
            }
            acao={
              alunos.length === 0 ? (
                <Link href="/dashboard/alunos" className="familia-adicionar-botao">
                  Adicionar aluno
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="partitura-dias">
            {[...porData.entries()].map(([data, doDia]) => {
              const partes = partesData(data)
              return (
                <section key={data} className="partitura-dia">
                  <header>
                    <span className="partitura-dia-numero">{partes.dia}</span>
                    <span>
                      <strong>{rotuloData(data)}</strong>
                      <small>
                        {partes.semana} · {partes.mes}
                      </small>
                    </span>
                  </header>
                  <div className="partitura-linha-tempo">
                    {doDia.map((aula, indice) => {
                      const estadoTemporal =
                        indice === 0
                          ? estadoTemporalAula(aula.data, aula.hora_inicio, aula.hora_fim, agora)
                          : 'futura'
                      return (
                        <Link
                          key={aula.chave}
                          href={`/aluno/${aula.alunoId}/horario`}
                          className={`partitura-aula ${estadoTemporal === 'agora' ? 'partitura-aula-agora' : ''}`}
                        >
                          <time>{formatarHora(aula.hora_inicio)}</time>
                          <span className="partitura-marca" aria-hidden="true" />
                          <span className="partitura-aula-conteudo">
                            {estadoTemporal === 'agora' && (
                              <small className="partitura-estado-temporal">Agora</small>
                            )}
                            {/* O aluno vem primeiro: numa agenda de
                                família é ele que diz de quem é a aula. */}
                            <strong>{aula.alunoNome}</strong>
                            <span>
                              {aula.reposicao ? 'Reposição · ' : ''}
                              {aula.disciplina}
                              {aula.professor ? ` · ${aula.professor}` : ''} ·{' '}
                              {formatarHora(aula.hora_inicio)}–{formatarHora(aula.hora_fim)}
                              {aula.sala ? ` · ${aula.sala}` : ''}
                            </span>
                          </span>
                          <span className="partitura-seta" aria-hidden="true">
                            →
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
