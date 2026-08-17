import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatarHora } from '@/lib/horarios-grade'
import { formatarSala } from '@/lib/sala'
import { agoraNaEscola, estadoTemporalAula, hojeISO, proximaOcorrenciaDeAula } from '@/lib/datas'
import { EmptyState } from '@/components/empty-state'

type AulaFamilia = {
  matriculaId: number
  alunoId: string
  alunoNome: string
  disciplina: string
  professor: string
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  sala: string | null
  data: string
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
  const [{ data: matriculasData }, { data: alunosData }] = await Promise.all([
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
  ])

  const alunos = alunosData ?? []
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
      dia_semana: string
      hora_inicio: string
      hora_fim: string
      salas: { nome: string; piso: number | null; numero: number | null } | null
    } | null
  }[]

  const aulas: AulaFamilia[] = linhas
    .filter((m) => m.horarios)
    .filter((m) => !filtroValido || m.aluno_id === filtroValido)
    .map((m) => ({
      matriculaId: m.id,
      alunoId: m.aluno_id,
      alunoNome: m.alunos?.nome ?? '',
      disciplina: m.instrumentos?.nome ?? '',
      professor: m.professor?.nome ?? '',
      dia_semana: m.horarios!.dia_semana,
      hora_inicio: m.horarios!.hora_inicio,
      hora_fim: m.horarios!.hora_fim,
      sala: formatarSala(m.horarios!.salas),
      data: proximaOcorrenciaDeAula(
        m.horarios!.dia_semana,
        m.horarios!.hora_inicio,
        m.horarios!.hora_fim
      ),
    }))
    .sort((a, b) =>
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
                          key={aula.matriculaId}
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
