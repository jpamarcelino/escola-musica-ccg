import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { DIAS_SEMANA, HOUR_HEIGHT, paraMinutos, formatarHora, formatarSala, agoraNaEscola, estadoTemporalAula, hojeISO, formatarDataEscolar, proximaAulaPorAcontecer, type DiaSemana } from '@ccg/core'
import { EmptyState } from '@/components/empty-state'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { desmarcarDiaProfessor } from '@/lib/actions/professor'
import { AgendaFamilia } from './agenda-familia'
import { ehContaCCG } from '@/lib/navegacao'

type Confirmado = {
  id: number
  aluno_id: string
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
  // Quem está neste bloco, com o nome ao lado do id. Preciso dos ids para
  // saber quem desmarcou naquela data, e dos nomes para mostrar só os que
  // vão mesmo aparecer.
  matriculas: { id: number; nome: string; disciplina: string | null }[]
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
  searchParams: Promise<{ aluno?: string; erro?: string; dia?: string }>
}) {
  const { aluno: alunoFiltro, erro, dia } = await searchParams
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
  // O mesmo teste, com outro nome, porque é outra decisão: só música tem
  // reposições, e desmarcar uma aula sem reposição a seguir seria só
  // perder a aula. Reutilizar `mostrarNomes` para isto ligava duas
  // regras que podem divergir amanhã.
  const podeDesmarcar = profile.programa === 'musica'

  const { data: confirmadosData } = await supabase
    .from('matriculas')
    .select(
      'id, aluno_id, horario_final_id, alunos(nome), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
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
    bloco.matriculas.push({
      id: c.id,
      nome: c.alunos?.nome ?? '',
      disciplina: c.instrumentos?.nome ?? null,
    })
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
          [...(canceladasPorMatricula.get(bloco.matriculas[0].id) ?? new Set<string>())].filter(
            (data) => bloco.matriculas.every((m) => canceladasPorMatricula.get(m.id)?.has(data))
          )
        )
      ),
    }))
    .filter((bloco): bloco is typeof bloco & { data: string } => bloco.data !== null)
    // Quem desmarcou aquela data sai da linha. Sem isto, o professor
    // continuava a ler "teste, antonio, oleola · 3 alunos" no dia em que
    // um deles já tinha avisado que não vinha — e preparava a aula para
    // três.
    .map((bloco) => {
      const vao = bloco.matriculas.filter(
        (m) => !canceladasPorMatricula.get(m.id)?.has(bloco.data)
      )
      return {
        ...bloco,
        alunos: vao.map((m) => m.nome),
        disciplinas: [...new Set(vao.map((m) => m.disciplina).filter((d): d is string => Boolean(d)))],
      }
    })
    .sort((a, b) =>
      a.data === b.data
        ? a.hora_inicio.localeCompare(b.hora_inicio)
        : a.data.localeCompare(b.data)
    )
  // A lista de dias junta as aulas da grelha semanal e as reposições, que
  // são avulsas. Entram na mesma lista e não numa secção à parte: quem
  // abre a agenda quer saber o que tem naquele dia, e uma reposição conta
  // tanto como as outras. O que muda é a etiqueta e não haver para onde
  // clicar — uma reposição não tem horário semanal por trás.
  type EntradaDia = {
    chave: string
    horarioId: number | null
    hora_inicio: string
    hora_fim: string
    sala: string | null
    alunos: string[]
    disciplinas: string[]
    data: string
    reposicao: boolean
  }

  const { data: reposicoesData } = await supabase
    .from('reposicoes')
    .select('id, data, hora_inicio, hora_fim, instrumento_nome, aluno_id')
    .eq('professor_id', user.id)
    .gte('data', hojeISO())
    .order('data')

  const nomePorAluno = new Map<string, string>()
  for (const c of confirmados) {
    if (c.alunos?.nome) nomePorAluno.set(c.aluno_id, c.alunos.nome)
  }

  const entradas: EntradaDia[] = [
    ...agendaTemporal.map((b) => ({
      chave: `h${b.horarioId}`,
      horarioId: b.horarioId,
      hora_inicio: b.hora_inicio,
      hora_fim: b.hora_fim,
      sala: b.sala,
      alunos: b.alunos,
      disciplinas: b.disciplinas,
      data: b.data,
      reposicao: false,
    })),
    ...(reposicoesData ?? []).map((r) => ({
      chave: `r${r.id}`,
      horarioId: null,
      hora_inicio: r.hora_inicio,
      hora_fim: r.hora_fim,
      sala: null,
      alunos: [nomePorAluno.get(r.aluno_id) ?? ''] as string[],
      disciplinas: r.instrumento_nome ? [r.instrumento_nome] : [],
      data: r.data,
      reposicao: true,
    })),
  ].sort((a, b) =>
    a.data === b.data ? a.hora_inicio.localeCompare(b.hora_inicio) : a.data.localeCompare(b.data)
  )

  const porData = new Map<string, EntradaDia[]>()
  for (const entrada of entradas) {
    const lista = porData.get(entrada.data) ?? []
    lista.push(entrada)
    porData.set(entrada.data, lista)
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

        <nav className="pt-2">
          <Link href="/dashboard/calendario" className="agenda-ligacao-calendario">
            Calendário do ano letivo
          </Link>
        </nav>

        {erro && <MensagemErro>{erro}</MensagemErro>}
        {dia && (
          <MensagemInfo>
            {dia === '1' ? '1 aula desmarcada.' : `${dia} aulas desmarcadas.`} Os alunos foram
            avisados.
          </MensagemInfo>
        )}

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
                  {/* A confirmação diz a data por extenso e quantas aulas
                      caem — é a diferença entre desmarcar um dia e
                      desmarcar o dia errado. */}
                  {/* Só se houver aulas da grelha semanal. Um dia que só
                      tenha reposições não tem nada para "desmarcar o dia"
                      apanhar — a função percorre matrículas, e o botão
                      prometia uma coisa que não ia acontecer. */}
                  {podeDesmarcar && aulas.some((a) => !a.reposicao) && (
                    <BotaoAcaoDestruir
                      label="Desmarcar o dia"
                      variante="editorial"
                      titulo="Desmarcar todas as aulas deste dia?"
                      mensagem={`${formatarDataEscolar(data, { weekday: 'long', day: 'numeric', month: 'long' })} — ${aulas.filter((a) => !a.reposicao).length} ${aulas.filter((a) => !a.reposicao).length === 1 ? 'aula' : 'aulas'}.\n\nCada aluno é avisado de que vai haver reposição.`}
                      action={desmarcarDiaProfessor}
                    >
                      <input type="hidden" name="data" value={data} />
                    </BotaoAcaoDestruir>
                  )}
                </header>
                <div className="partitura-linha-tempo">
                  {aulas.map((aula, indice) => {
                    const estadoTemporal = indice === 0
                      ? estadoTemporalAula(aula.data, aula.hora_inicio, aula.hora_fim, agora)
                      : 'futura'
                    // Dois ramos e não um componente escolhido em
                    // variável: uma reposição não tem horário semanal por
                    // trás, logo não tem para onde levar, e um <Link> sem
                    // destino não existe.
                    const conteudo = (
                      <>
                      <time>{formatarHora(aula.hora_inicio)}</time>
                      <span className="partitura-marca" aria-hidden="true" />
                      <span className="partitura-aula-conteudo">
                        {estadoTemporal === 'agora' && <small className="partitura-estado-temporal">Agora</small>}
                        {aula.reposicao && <small className="partitura-estado-temporal">Reposição</small>}
                        {/* A disciplina em destaque e o aluno por baixo, como
                            no painel inicial. A agenda mostrava só o nome, e
                            quem ensina duas disciplinas ao mesmo aluno não
                            distinguia as aulas justamente onde prepara o dia. */}
                        <strong>{aula.disciplinas.length ? aula.disciplinas.join(' · ') : aula.alunos.join(', ')}</strong>
                        <span>{aula.alunos.join(', ')} · {formatarHora(aula.hora_inicio)}–{formatarHora(aula.hora_fim)}{aula.sala ? ` · ${aula.sala}` : ''}</span>
                      </span>
                      <span className="partitura-alunos">{aula.alunos.length} {aula.alunos.length === 1 ? 'aluno' : 'alunos'}</span>
                      {!aula.reposicao && <span className="partitura-seta" aria-hidden="true">→</span>}
                      </>
                    )
                    return aula.reposicao ? (
                      <div key={aula.chave} className="partitura-aula">{conteudo}</div>
                    ) : (
                      <Link
                        key={aula.chave}
                        href={`/dashboard/agenda/${aula.horarioId}`}
                        className={`partitura-aula ${estadoTemporal === 'agora' ? 'partitura-aula-agora' : ''}`}
                      >
                        {conteudo}
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
