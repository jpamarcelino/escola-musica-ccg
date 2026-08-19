import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { DIAS_SEMANA, HOUR_HEIGHT, paraMinutos, formatarHora, formatarSala, agoraNaEscola, estadoTemporalAula, hojeISO, proximaAulaPorAcontecer, type DiaSemana } from '@ccg/core'
import { EmptyState } from '@/components/empty-state'
import { AgendaFamilia } from './agenda-familia'
import { ehContaCCG } from '@/lib/navegacao'

type Confirmado = {
  id: number
  horario_final_id: number | null
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
  horarios: {
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

type BlocoAgenda = {
  horarioId: number
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fim: string
  sala: string | null
  alunos: string[]
  disciplinas: string[]
  // Quem está neste bloco. Preciso para saber se a aula foi desmarcada:
  // um bloco de grupo só desaparece quando todos desmarcaram.
  matriculas: number[]
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

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>
}) {
  const { aluno: alunoFiltro } = await searchParams
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }

  // A mesma rota serve dois calendários diferentes: o do professor (o
  // resto deste ficheiro, inalterado) e o da família. Antes, quem não
  // fosse professor era mandado embora — a Conta CCG tinha um separador
  // "Agenda" na barra que não levava a agenda nenhuma.
  if (ehContaCCG(profile?.tipo)) {
    return <AgendaFamilia supabase={supabase} userId={user.id} alunoFiltro={alunoFiltro} />
  }

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const mostrarNomes = profile.programa === 'musica'

  const { data: confirmadosData } = await supabase
    .from('matriculas')
    .select(
      'id, horario_final_id, alunos(nome), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
    )
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .not('horario_final_id', 'is', null)
    .order('criado_em')
  const confirmados = (confirmadosData ?? []) as unknown as Confirmado[]

  const { data: desmarcadasData } = await supabase
    .from('aulas_desmarcadas')
    .select('matricula_id, data')
    .eq('professor_id', user.id)
    .gte('data', hojeISO())
  const canceladasPorMatricula = new Map<number, Set<string>>()
  for (const d of desmarcadasData ?? []) {
    const atual = canceladasPorMatricula.get(d.matricula_id) ?? new Set<string>()
    atual.add(d.data)
    canceladasPorMatricula.set(d.matricula_id, atual)
  }

  // Agrupa por horario_final_id — mais que um aluno pode partilhar o mesmo
  // horário (ex: aula de grupo em dança).
  const blocosPorHorario = new Map<number, BlocoAgenda>()
  for (const c of confirmados) {
    if (!c.horario_final_id || !c.horarios) continue
    const bloco = blocosPorHorario.get(c.horario_final_id) ?? {
      horarioId: c.horario_final_id,
      dia_semana: c.horarios.dia_semana,
      hora_inicio: c.horarios.hora_inicio,
      hora_fim: c.horarios.hora_fim,
      sala: formatarSala(c.horarios.salas),
      alunos: [],
      disciplinas: [],
      matriculas: [],
    }
    bloco.matriculas.push(c.id)
    bloco.alunos.push(c.alunos?.nome ?? '')
    // Uma aula de grupo partilha o horário mas pode juntar disciplinas
    // diferentes, por isso guarda-se cada uma só uma vez.
    const disciplina = c.instrumentos?.nome
    if (disciplina && !bloco.disciplinas.includes(disciplina)) bloco.disciplinas.push(disciplina)
    blocosPorHorario.set(c.horario_final_id, bloco)
  }
  const blocos = [...blocosPorHorario.values()]
  const agora = agoraNaEscola()
  const agendaTemporal = blocos
    .map((bloco) => ({
      ...bloco,
      data: proximaAulaPorAcontecer(
        bloco.dia_semana,
        bloco.hora_inicio,
        bloco.hora_fim,
        // A interseção: as datas em que NENHUM dos alunos deste bloco tem
        // aula. Se um continuar inscrito, o professor tem de lá estar.
        new Set(
          [...(canceladasPorMatricula.get(bloco.matriculas[0]) ?? new Set<string>())].filter(
            (data) => bloco.matriculas.every((id) => canceladasPorMatricula.get(id)?.has(data))
          )
        )
      ),
    }))
    .filter((bloco): bloco is typeof bloco & { data: string } => bloco.data !== null)
    .sort((a, b) =>
      a.data === b.data
        ? a.hora_inicio.localeCompare(b.hora_inicio)
        : a.data.localeCompare(b.data)
    )
  const porData = new Map<string, typeof agendaTemporal>()
  for (const bloco of agendaTemporal) {
    const lista = porData.get(bloco.data) ?? []
    lista.push(bloco)
    porData.set(bloco.data, lista)
  }

  const horariosPorDia = new Map<string, BlocoAgenda[]>()
  const indicePorHorario = new Map<number, number>()
  let horaInicioGrade = 0
  let horasGrade: number[] = []
  let alturaGrade = 0

  if (blocos.length > 0) {
    horaInicioGrade = Math.floor(
      Math.min(...blocos.map((b) => paraMinutos(b.hora_inicio))) / 60
    )
    const horaFimGrade = Math.ceil(
      Math.max(...blocos.map((b) => paraMinutos(b.hora_fim))) / 60
    )
    horasGrade = Array.from(
      { length: horaFimGrade - horaInicioGrade },
      (_, i) => horaInicioGrade + i
    )
    alturaGrade = horasGrade.length * HOUR_HEIGHT

    for (const dia of DIAS_SEMANA) horariosPorDia.set(dia, [])
    for (const b of blocos) horariosPorDia.get(b.dia_semana)?.push(b)
    for (const dia of DIAS_SEMANA) {
      horariosPorDia.get(dia)?.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    }

    let indiceAtual = 0
    for (const dia of DIAS_SEMANA) {
      for (const b of horariosPorDia.get(dia) ?? []) {
        indicePorHorario.set(b.horarioId, indiceAtual)
        indiceAtual += 1
      }
    }
  }

  const diaHoje = DIAS_SEMANA[(agora.getDay() + 6) % 7]
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes()
  const mostrarLinhaAgora = blocos.length > 0
    && minutosAgora >= horaInicioGrade * 60
    && minutosAgora <= (horaInicioGrade * 60) + (alturaGrade / HOUR_HEIGHT) * 60
  const topoLinhaAgora = ((minutosAgora - horaInicioGrade * 60) / 60) * HOUR_HEIGHT

  return (
    <main id="conteudo-principal" className="partitura-pagina partitura-agenda">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">←</Link>
          <div>
            <p className="partitura-sobretitulo">O teu tempo</p>
            <h1>Agenda</h1>
            {agendaTemporal[0] && <p>A próxima aula começa às {formatarHora(agendaTemporal[0].hora_inicio)}.</p>}
          </div>
        </header>

        {blocos.length === 0 ? (
          <EmptyState titulo="Ainda não tens aulas confirmadas" />
        ) : (
          <>
            <div className="partitura-dias">
              {[...porData.entries()].map(([data, aulas]) => {
                const partes = partesData(data)
                return (
              <section key={data} className="partitura-dia">
                <header>
                  <span className="partitura-dia-numero">{partes.dia}</span>
                  <span><strong>{rotuloData(data)}</strong><small>{partes.semana} · {partes.mes}</small></span>
                </header>
                <div className="partitura-linha-tempo">
                  {aulas.map((aula, indice) => {
                    const estadoTemporal = indice === 0
                      ? estadoTemporalAula(aula.data, aula.hora_inicio, aula.hora_fim, agora)
                      : 'futura'
                    return (
                    <Link
                      key={aula.horarioId}
                      href={`/dashboard/agenda/${aula.horarioId}`}
                      className={`partitura-aula ${estadoTemporal === 'agora' ? 'partitura-aula-agora' : ''}`}
                    >
                      <time>{formatarHora(aula.hora_inicio)}</time>
                      <span className="partitura-marca" aria-hidden="true" />
                      <span className="partitura-aula-conteudo">
                        {estadoTemporal === 'agora' && <small className="partitura-estado-temporal">Agora</small>}
                        {/* A disciplina em destaque e o aluno por baixo, como
                            no painel inicial. A agenda mostrava só o nome, e
                            quem ensina duas disciplinas ao mesmo aluno não
                            distinguia as aulas justamente onde prepara o dia. */}
                        <strong>{aula.disciplinas.length ? aula.disciplinas.join(' · ') : aula.alunos.join(', ')}</strong>
                        <span>{aula.alunos.join(', ')} · {formatarHora(aula.hora_inicio)}–{formatarHora(aula.hora_fim)}{aula.sala ? ` · ${aula.sala}` : ''}</span>
                      </span>
                      <span className="partitura-alunos">{aula.alunos.length} {aula.alunos.length === 1 ? 'aluno' : 'alunos'}</span>
                      <span className="partitura-seta" aria-hidden="true">→</span>
                    </Link>
                    )
                  })}
                </div>
              </section>
                )
              })}
            </div>

            <details className="partitura-grelha">
              <summary>
                Ver grelha semanal
              </summary>
              <p>
                A grelha ajuda a comparar horários. Para o uso diário, a lista acima é mais rápida.
              </p>
              <div className="horarios-grade" aria-label="Grelha semanal de aulas">
              <div className="horarios-coluna-horas">
                <div className="horarios-coluna-horas-cabecalho" />
                {horasGrade.map((hora) => (
                  <div
                    key={hora}
                    className="horarios-hora-label"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    {hora}h
                  </div>
                ))}
              </div>
              {DIAS_SEMANA.map((dia) => (
                <div key={dia} className="horarios-coluna-dia">
                  <div className="horarios-coluna-dia-cabecalho">{dia.slice(0, 3)}</div>
                  <div
                    className="horarios-coluna-dia-corpo"
                    style={{
                      height: alturaGrade,
                      backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
                    }}
                  >
                    {dia === diaHoje && mostrarLinhaAgora && (
                      <div
                        className="agenda-agora-linha"
                        style={{ transform: `translateY(${topoLinhaAgora}px)` }}
                        aria-label={`Agora, ${formatarHora(`${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`)}`}
                      >
                        <span aria-hidden="true" />
                      </div>
                    )}
                    {horariosPorDia.get(dia)?.map((b) => {
                      const inicioMin = paraMinutos(b.hora_inicio)
                      const fimMin = paraMinutos(b.hora_fim)
                      const estilo = {
                        top: ((inicioMin - horaInicioGrade * 60) / 60) * HOUR_HEIGHT,
                        height: ((fimMin - inicioMin) / 60) * HOUR_HEIGHT,
                        '--card-index': indicePorHorario.get(b.horarioId) ?? 0,
                      } as CSSProperties

                      return (
                        <Link
                          key={b.horarioId}
                          href={`/dashboard/agenda/${b.horarioId}`}
                          className="horario-bloco entrada-esquerda"
                          style={estilo}
                          title={[b.sala, mostrarNomes ? null : b.alunos.join(', ')]
                            .filter(Boolean)
                            .join(' — ') || undefined}
                        >
                          <span>{formatarHora(b.hora_inicio)}</span>
                          <span>{formatarHora(b.hora_fim)}</span>
                          {b.sala && (
                            <span className="horario-bloco-sala">{b.sala}</span>
                          )}
                          {mostrarNomes && (
                            <span className="horario-bloco-alunos">
                              {b.alunos.join(', ')}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
              </div>
            </details>
          </>
        )}
      </div>
    </main>
  )
}
