import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays, ChevronRight, LayoutGrid } from 'lucide-react'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { formatarHora, formatarSala, agoraNaEscola, estadoTemporalAula, hojeISO, formatarDataEscolar, proximaAulaPorAcontecer, type DiaSemana } from '@ccg/core'
import { EmptyState } from '@/components/empty-state'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { desmarcarDiaProfessor } from '@/lib/actions/professor'
import { AgendaFamilia } from './agenda-familia'
import { ehContaCCG } from '@/lib/navegacao'
import { VoltarAtras } from '@/components/voltar-atras'

type Confirmado = {
  id: number
  aluno_id: string
  horario_final_id: number | null
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
  horarios: {
    nome: string | null
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

type BlocoAgenda = {
  horarioId: number
  // O nome da turma, quando o professor lhe deu um. Numa aula de grupo
  // é o que ele procura no cartão; dez nomes seguidos não cabem nem se
  // leem.
  nome: string | null
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

// Só o número do dia, para a caixa azul. O dia da semana e o mês saíram
// do cabeçalho: em "Hoje" e "Amanhã" acrescentavam uma linha que ninguém
// precisa de ler, e nos outros dias repetiam à letra o que o próprio
// rótulo já diz ("Sexta-feira, 5 de setembro" sobre "sexta-feira ·
// setembro").
function diaDoMes(data: string): string {
  return String(Number(data.split('-')[2])).padStart(2, '0')
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

  // Só música tem reposições, e desmarcar uma aula sem reposição a
  // seguir seria só perder a aula.
  const podeDesmarcar = profile.programa === 'musica'

  const { data: confirmadosData } = await supabase
    .from('matriculas')
    .select(
      'id, aluno_id, horario_final_id, alunos(nome), instrumentos(nome), horarios(nome, dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
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
      nome: c.horarios.nome,
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
    nome: string | null
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
    .eq('estado', 'confirmada')
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
      nome: b.nome,
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
      // Uma reposição é sempre de um aluno só: não há turma a nomear.
      nome: null,
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


  return (
    <main id="conteudo-principal" className="pinterest-agenda pinterest-agenda-professor">
      <div className="pinterest-agenda-folha">
        <header className="pinterest-agenda-cabecalho">
          <VoltarAtras destino="/dashboard" className="pinterest-agenda-voltar" rotulo="Voltar ao início" tamanho={23} />
          <div>
            <h1>Agenda</h1>
            <p>
              {agendaTemporal[0]
                ? `Próxima aula às ${formatarHora(agendaTemporal[0].hora_inicio)}`
                : 'As tuas próximas aulas'}
            </p>
          </div>
        </header>

        {/* Os dois atalhos que respondem a perguntas que a lista não
            responde: o calendário a "há aulas no dia 8?" e a grelha a
            "como é a minha semana?". Ficam no topo e não no fim — no
            fundo da página só os encontrava quem já tivesse rolado a
            agenda toda, que é justamente quem não precisa deles. */}
        <nav className="pinterest-agenda-atalhos" aria-label="Outras vistas">
          <Link href="/dashboard/calendario" className="agenda-ligacao-calendario">
            <CalendarDays size={20} aria-hidden="true" />
            <span>
              <strong>Calendário escolar</strong>
              <small>Férias, feriados e interrupções</small>
            </span>
            <ChevronRight size={19} aria-hidden="true" />
          </Link>
          <Link href="/dashboard/agenda/semana" className="pinterest-agenda-semana">
            <LayoutGrid size={20} aria-hidden="true" />
            <span>
              <strong>Ver a semana em grelha</strong>
              <small>Todos os horários lado a lado</small>
            </span>
            <ChevronRight size={19} aria-hidden="true" />
          </Link>
        </nav>

        {/* As mensagens ganham superfície própria: soltas sobre o cinzento
            liam-se como legenda do cabeçalho e não como resposta a uma
            ação que acabou de acontecer. */}
        {(erro || dia) && (
          <div className="pinterest-agenda-mensagem">
            {erro && <MensagemErro>{erro}</MensagemErro>}
            {dia && (
              <MensagemInfo>
                {dia === '1' ? '1 aula desmarcada.' : `${dia} aulas desmarcadas.`} Os alunos foram
                avisados.
              </MensagemInfo>
            )}
          </div>
        )}

        {blocos.length === 0 ? (
          <EmptyState
            titulo="Ainda não tens aulas confirmadas"
            descricao="As aulas aparecem aqui assim que confirmares um pedido de horário."
          />
        ) : (
          <>
            <div className="partitura-dias pinterest-agenda-dias">
              {[...porData.entries()].map(([data, aulas]) => {
                // A contagem separada existe para a confirmação poder
                // dizer o que vai mesmo acontecer: uma reposição não é
                // uma aula da grelha, e desmarcá-la tem outra
                // consequência para quem a esperava.
                const daGrelha = aulas.filter((a) => !a.reposicao)
                const reposicoesDoDia = aulas.length - daGrelha.length
                return (
                  <section key={data} className="partitura-dia">
                    <header>
                      <span className="partitura-dia-numero">{diaDoMes(data)}</span>
                      <span>
                        <strong>{rotuloData(data)}</strong>
                      </span>
                      {/* A confirmação diz a data por extenso e quantas
                          aulas caem — é a diferença entre desmarcar um dia
                          e desmarcar o dia errado. */}
                      {podeDesmarcar && aulas.length > 0 && (
                        <BotaoAcaoDestruir
                          label="Desmarcar o dia"
                          variante="editorial"
                          titulo="Desmarcar tudo o que tens neste dia?"
                          mensagem={[
                            formatarDataEscolar(data, { weekday: 'long', day: 'numeric', month: 'long' }),
                            ' — ',
                            daGrelha.length > 0
                              ? `${daGrelha.length} ${daGrelha.length === 1 ? 'aula' : 'aulas'}`
                              : '',
                            daGrelha.length > 0 && reposicoesDoDia > 0 ? ' e ' : '',
                            reposicoesDoDia > 0
                              ? `${reposicoesDoDia} ${reposicoesDoDia === 1 ? 'reposição' : 'reposições'}`
                              : '',
                            '.\n\n',
                            daGrelha.length > 0
                              ? 'Cada aluno é avisado de que vai haver reposição.'
                              : '',
                            daGrelha.length > 0 && reposicoesDoDia > 0 ? ' ' : '',
                            reposicoesDoDia > 0
                              ? 'As reposições deste dia são desmarcadas e voltam a poder ser remarcadas.'
                              : '',
                          ].join('')}
                          action={desmarcarDiaProfessor}
                        >
                          <input type="hidden" name="data" value={data} />
                        </BotaoAcaoDestruir>
                      )}
                    </header>
                    <div className="partitura-linha-tempo">
                      {aulas.map((aula, indice) => {
                        const estadoTemporal =
                          indice === 0
                            ? estadoTemporalAula(aula.data, aula.hora_inicio, aula.hora_fim, agora)
                            : 'futura'
                        // Dois ramos e não um componente escolhido em
                        // variável: uma reposição não tem horário semanal
                        // por trás, logo não tem para onde levar, e um
                        // <Link> sem destino não existe.
                        const conteudo = (
                          <>
                            <time>{formatarHora(aula.hora_inicio)}</time>
                            <span className="partitura-marca" aria-hidden="true" />
                            <span className="partitura-aula-conteudo">
                              {estadoTemporal === 'agora' && (
                                <small className="partitura-estado-temporal">Agora</small>
                              )}
                              {aula.reposicao && (
                                <small className="partitura-estado-temporal">Reposição</small>
                              )}
                              {/* A disciplina em destaque e o aluno por
                                  baixo, como no painel inicial. */}
                              {/* Com nome de turma, o nome é o título e
                                  a segunda linha conta quantos vêm. Sem
                                  ele fica a disciplina em cima e os
                                  nomes por baixo, como sempre esteve —
                                  numa aula individual é isso que se quer
                                  ler. */}
                              <strong>
                                {aula.nome
                                  ? aula.nome
                                  : aula.disciplinas.length
                                    ? aula.disciplinas.join(' · ')
                                    : aula.alunos.join(', ')}
                              </strong>
                              <span>
                                {aula.nome
                                  ? [
                                      aula.disciplinas.join(' · '),
                                      `${aula.alunos.length} ${aula.alunos.length === 1 ? 'aluno' : 'alunos'}`,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')
                                  : aula.alunos.join(', ')}{' '}
                                · {formatarHora(aula.hora_inicio)}–
                                {formatarHora(aula.hora_fim)}
                                {aula.sala ? ` · ${aula.sala}` : ''}
                              </span>
                            </span>
                            {/* Só em aula de grupo. Com um aluno, o número
                                repetia o nome que está uma linha acima. */}
                            {aula.alunos.length > 1 && (
                              <span className="partitura-alunos">{aula.alunos.length}</span>
                            )}
                            {!aula.reposicao && (
                              <ChevronRight className="partitura-seta" size={19} aria-hidden="true" />
                            )}
                          </>
                        )
                        return aula.reposicao ? (
                          <div key={aula.chave} className="partitura-aula">
                            {conteudo}
                          </div>
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
          </>
        )}
      </div>
    </main>
  )
}
