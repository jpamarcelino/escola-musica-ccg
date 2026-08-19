import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { InstalarCallout } from '@/components/instalar-callout'
import { MensagemErro } from '@/components/mensagem'
import { EmptyState } from '@/components/empty-state'
import { agoraNaEscola, estadoTemporalAula, proximaAulaPorAcontecer, hojeISO, formatarHora, formatarSala, DIAS_SEMANA, type DiaSemana } from '@ccg/core'
import type { MatriculaEstado } from '@ccg/types'

type AulaConfirmada = {
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

// "Hoje", "Amanhã", ou o dia da semana — para a lista de próximas aulas.
function rotuloDoDia(dataISO: string, diaSemana: string): string {
  const hoje = hojeISO()
  if (dataISO === hoje) return 'Hoje'
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  const amanhaISO = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`
  if (dataISO === amanhaISO) return 'Amanhã'
  return diaSemana
}

function dataEditorial(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const data = new Date(ano, mes - 1, dia)
  return {
    dia: String(dia).padStart(2, '0'),
    semana: new Intl.DateTimeFormat('pt-PT', { weekday: 'long' }).format(data),
    mes: new Intl.DateTimeFormat('pt-PT', { month: 'short' }).format(data).replace('.', ''),
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams

  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }

  // Contas admin (direção/secretaria) vão direto para a Visão geral — só
  // se ainda tiverem acesso (um super admin pode ter revogado o "admin").
  if (profile?.tipo === 'admin' && profile.admin) {
    redirect('/admin')
  }

  // Só o primeiro nome na saudação — o hero é pessoal, não um registo.
  const primeiroNome = (profile?.nome ?? '').trim().split(/\s+/)[0] || 'bem-vindo'

  /* ------------------------------------------------------------------ */
  /* PROFESSOR                                                           */
  /* ------------------------------------------------------------------ */
  if (profile?.tipo === 'professor') {
    const [{ data: horariosData }, { data: confirmadasData }, { count: pedidosPendentes }] =
      await Promise.all([
        supabase
          .from('horarios')
          .select('id, estado')
          .eq('professor_id', user.id),
        supabase
          .from('matriculas')
          .select(
            'id, horario_final_id, alunos(nome), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
          )
          .eq('professor_id', user.id)
          .eq('estado', 'confirmado')
          .not('horario_final_id', 'is', null),
        supabase
          .from('matriculas')
          .select('id', { count: 'exact', head: true })
          .eq('professor_id', user.id)
          .eq('estado', 'a_escolher'),
      ])

    const horarios = horariosData ?? []
    const confirmadas = (confirmadasData ?? []) as unknown as AulaConfirmada[]

    // As aulas que já foram desmarcadas. Não há linha por aula — a grelha
    // é semanal — por isso é esta lista que diz quais das ocorrências
    // futuras já não vão acontecer.
    const { data: desmarcadasProf } = await supabase
      .from('aulas_desmarcadas')
      .select('matricula_id, data')
      .eq('professor_id', user.id)
      .gte('data', hojeISO())
    const canceladasPorMatricula = new Map<number, Set<string>>()
    for (const d of desmarcadasProf ?? []) {
      const atual = canceladasPorMatricula.get(d.matricula_id) ?? new Set<string>()
      atual.add(d.data)
      canceladasPorMatricula.set(d.matricula_id, atual)
    }

    // Ocupação da agenda: horários (não bloqueados) com pelo menos um
    // aluno confirmado ÷ horários disponíveis. Em dança vários alunos
    // partilham o mesmo horário, por isso conta-se por horário distinto.
    const horariosAtivos = horarios.filter((h) => h.estado !== 'bloqueado')
    const horariosOcupados = new Set(
      confirmadas.map((c) => c.horario_final_id).filter((id): id is number => id !== null)
    )
    const ocupacao =
      horariosAtivos.length > 0
        ? Math.round((horariosOcupados.size / horariosAtivos.length) * 100)
        : null

    // Próximas 3 aulas: cada matrícula confirmada repete-se semanalmente;
    // ordena pela próxima ocorrência real (data + hora de início).
    const proximas = confirmadas
      .filter((c) => c.horarios)
      .map((c) => {
        const data = proximaAulaPorAcontecer(
          c.horarios!.dia_semana,
          c.horarios!.hora_inicio,
          c.horarios!.hora_fim,
          canceladasPorMatricula.get(c.id) ?? new Set<string>()
        )
        return { ...c, data }
      })
      .filter((c): c is typeof c & { data: string } => c.data !== null)
      .sort((a, b) =>
        a.data === b.data
          ? a.horarios!.hora_inicio.localeCompare(b.horarios!.hora_inicio)
          : a.data.localeCompare(b.data)
      )
      .slice(0, 3)

    // A Home dá prioridade ao trabalho operacional: depois de uma aula
    // terminar, as presenças em falta aparecem antes da restante agenda.
    const agora = agoraNaEscola()
    const diaHoje = DIAS_SEMANA[(agora.getDay() + 6) % 7]
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
    const matriculasTerminadasHoje = confirmadas.filter(
      (m) => m.horarios?.dia_semana === diaHoje && m.horarios.hora_fim <= horaAtual
    )
    const idsTerminadasHoje = matriculasTerminadasHoje.map((m) => m.id)
    const { data: presencasHojeData } = idsTerminadasHoje.length
      ? await supabase
          .from('presencas')
          .select('matricula_id')
          .eq('data', hojeISO())
          .in('matricula_id', idsTerminadasHoje)
      : { data: [] }
    const presencasMarcadasHoje = new Set(
      (presencasHojeData ?? []).map((p) => p.matricula_id)
    )
    const presencasPorConfirmar = idsTerminadasHoje.filter(
      (id) => !presencasMarcadasHoje.has(id)
    ).length

    const hojeEditorial = dataEditorial(hojeISO())

    return (
      <main id="conteudo-principal" className="partitura-pagina">
        <div className="partitura-folha">
          <header className="partitura-cabecalho">
            <div className="partitura-data" aria-label={`${hojeEditorial.dia} de ${hojeEditorial.mes}`}>
              <span>{hojeEditorial.dia}</span>
              <span>{hojeEditorial.mes}</span>
            </div>
            <div>
              <p className="partitura-sobretitulo">{hojeEditorial.semana} · o teu dia</p>
              <h1>Olá, {primeiroNome}.</h1>
              <p className="partitura-contexto">
                {profile.programa
                  ? `Escola de ${profile.programa === 'musica' ? 'Música' : 'Dança'}`
                  : 'Centro Cultural da Guarda'}
              </p>
            </div>
          </header>

          {presencasPorConfirmar > 0 && (
            <Link href="/dashboard/presencas/confirmar" className="partitura-alerta">
              <span className="partitura-alerta-numero">{presencasPorConfirmar}</span>
              <span><strong>Presenças por confirmar</strong><small>de aulas que já terminaram hoje</small></span>
              <span aria-hidden="true">→</span>
            </Link>
          )}

          <section className="partitura-seccao" aria-labelledby="titulo-proximas">
            <div className="partitura-seccao-cabecalho">
              <div>
                <p className="partitura-indice">01</p>
                <h2 id="titulo-proximas">Próximas aulas</h2>
              </div>
              <Link href="/dashboard/agenda">Agenda completa</Link>
            </div>

            {proximas.length === 0 ? (
              <p className="partitura-vazio">
                {ocupacao === null
                  ? 'Ainda não tens horários definidos.'
                  : 'Hoje não tens mais aulas marcadas.'}
              </p>
            ) : (
              <div className="partitura-linha-tempo">
                {proximas.map((aula, indice) => {
                  const sala = formatarSala(aula.horarios!.salas)
                  const estadoTemporal = indice === 0
                    ? estadoTemporalAula(
                        aula.data,
                        aula.horarios!.hora_inicio,
                        aula.horarios!.hora_fim,
                        agora
                      )
                    : 'futura'
                  return (
                    <Link
                      key={aula.id}
                      href={`/dashboard/agenda/${aula.horario_final_id}`}
                      className={`partitura-aula ${estadoTemporal === 'agora' ? 'partitura-aula-agora' : indice === 0 ? 'partitura-aula-atual' : ''}`}
                    >
                      <time>{formatarHora(aula.horarios!.hora_inicio)}</time>
                      <span className="partitura-marca" aria-hidden="true" />
                      <span className="partitura-aula-conteudo">
                        {indice === 0 && <small className="partitura-estado-temporal">{estadoTemporal === 'agora' ? 'Agora' : 'A seguir'}</small>}
                        <strong>{aula.instrumentos?.nome}</strong>
                        <span>{aula.alunos?.nome}</span>
                        <span>{rotuloDoDia(aula.data, aula.horarios!.dia_semana)} · {formatarHora(aula.horarios!.hora_inicio)}–{formatarHora(aula.horarios!.hora_fim)}{sala ? ` · ${sala}` : ''}</span>
                      </span>
                      <span className="partitura-seta" aria-hidden="true">→</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          <section className="partitura-seccao" aria-labelledby="titulo-gestao">
            <div className="partitura-seccao-cabecalho">
              <div><p className="partitura-indice">02</p><h2 id="titulo-gestao">Gestão</h2></div>
            </div>
            <nav className="partitura-links" aria-label="Ferramentas de gestão">
              <Link href="/dashboard/presencas"><span>Presenças</span><small>Registar e consultar</small><b aria-hidden="true">→</b></Link>
              <Link href="/dashboard/horarios"><span>Horários</span><small>Disponibilidade semanal</small><b aria-hidden="true">→</b></Link>
              <Link href="/dashboard/mensalidades"><span>Mensalidades</span><small>Estado dos pagamentos</small><b aria-hidden="true">→</b></Link>
              {/* Só música tem reposições — em dança o separador levava a
                  um formulário que não serve para nada. */}
              {profile.programa === 'musica' && (
                <Link href="/dashboard/reposicoes"><span>Reposições</span><small>Vagas para repor aulas</small><b aria-hidden="true">→</b></Link>
              )}
              {(pedidosPendentes ?? 0) > 0 && (
                <Link href="/dashboard/pedidos"><span>Pedidos</span><small>{pedidosPendentes} por responder</small><b aria-hidden="true">→</b></Link>
              )}
            </nav>
          </section>

          <div className="partitura-instalacao"><InstalarCallout /></div>
        </div>
      </main>
    )
  }

  /* ------------------------------------------------------------------ */
  /* ENCARREGADO / ALUNO                                                 */
  /* ------------------------------------------------------------------ */
  type MatriculaFilho = {
    id: number
    aluno_id: string
    estado: MatriculaEstado
    instrumentos: { nome: string } | null
    horarios: {
      dia_semana: DiaSemana
      hora_inicio: string
      hora_fim: string
      salas: { nome: string; piso: number | null; numero: number | null } | null
    } | null
    alunos: { nome: string } | null
  }

  // As duas consultas correm em paralelo: as matrículas filtram-se pelo
  // encarregado através do join a "alunos" (!inner), em vez de esperar
  // pela lista de ids da primeira consulta. Poupa um ida-e-volta à base
  // de dados no carregamento da Home.
  const [{ data: meusAlunosData }, { data: matriculasData }, { data: avisosData }] = await Promise.all([
    supabase.from('alunos').select('id, nome').eq('encarregado_id', user.id).order('criado_em'),
    supabase
      .from('matriculas')
      .select(
        'id, aluno_id, estado, instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero)), alunos!inner(nome, encarregado_id)'
      )
      .eq('alunos.encarregado_id', user.id)
      .in('estado', ['a_escolher', 'confirmado']),
    supabase
      .from('notificacoes')
      .select('id, mensagem, criado_em')
      .eq('user_id', user.id)
      .eq('lida', false)
      .order('criado_em', { ascending: false })
      .limit(1),
  ])
  const meusAlunos = meusAlunosData ?? []
  const matriculas = (matriculasData ?? []) as unknown as MatriculaFilho[]
  const avisoMaisRecente = avisosData?.[0] ?? null

  const { data: desmarcadasFamilia } = await supabase
    .from('aulas_desmarcadas')
    .select('matricula_id, data')
    .gte('data', hojeISO())
  const canceladasFamilia = new Map<number, Set<string>>()
  for (const d of desmarcadasFamilia ?? []) {
    const atual = canceladasFamilia.get(d.matricula_id) ?? new Set<string>()
    atual.add(d.data)
    canceladasFamilia.set(d.matricula_id, atual)
  }

  const confirmadasFilhos = matriculas.filter((m) => m.estado === 'confirmado' && m.horarios)

  function resumoDoFilho(alunoId: string) {
    const doFilho = confirmadasFilhos
      .filter((m) => m.aluno_id === alunoId)
      .map((m) => ({
        ...m,
        data: proximaAulaPorAcontecer(
          m.horarios!.dia_semana,
          m.horarios!.hora_inicio,
          m.horarios!.hora_fim,
          canceladasFamilia.get(m.id) ?? new Set<string>()
        ),
      }))
      .filter((m): m is typeof m & { data: string } => m.data !== null)
      .sort((a, b) =>
        a.data === b.data
          ? a.horarios!.hora_inicio.localeCompare(b.horarios!.hora_inicio)
          : a.data.localeCompare(b.data)
      )
    const proxima = doFilho[0] ?? null

    const pendentes = matriculas.filter(
      (m) => m.aluno_id === alunoId && m.estado === 'a_escolher'
    ).length

    return { proxima, pendentes }
  }
  const proximaGlobal = confirmadasFilhos
    .map((m) => ({
      ...m,
      data: proximaAulaPorAcontecer(
        m.horarios!.dia_semana,
        m.horarios!.hora_inicio,
        m.horarios!.hora_fim,
        canceladasFamilia.get(m.id) ?? new Set<string>()
      ),
    }))
    .filter((m): m is typeof m & { data: string } => m.data !== null)
    .sort((a, b) =>
      a.data === b.data
        ? a.horarios!.hora_inicio.localeCompare(b.horarios!.hora_inicio)
        : a.data.localeCompare(b.data)
    )[0] ?? null

  const hojeEditorialAluno = dataEditorial(hojeISO())

  return (
    <main id="conteudo-principal" className="partitura-pagina familia-pagina">
      <div className="partitura-folha">
        <header className="partitura-cabecalho">
          <div className="partitura-data" aria-label={`${hojeEditorialAluno.dia} de ${hojeEditorialAluno.mes}`}><span>{hojeEditorialAluno.dia}</span><span>{hojeEditorialAluno.mes}</span></div>
          <div><p className="partitura-sobretitulo">{hojeEditorialAluno.semana} · em família</p><h1>Olá, {primeiroNome}.</h1><p className="partitura-contexto">Escolas Artísticas do CCG</p></div>
        </header>

        {erro && <MensagemErro>{erro}</MensagemErro>}

        {avisoMaisRecente && (
          <Link href="/dashboard/avisos" className="familia-aviso"><span>Novo aviso</span><strong>{avisoMaisRecente.mensagem}</strong><i aria-hidden="true">→</i></Link>
        )}

        <section className="familia-proxima" aria-labelledby="proxima-familia-titulo">
          <div className="partitura-seccao-cabecalho"><div><p className="partitura-indice">01</p><h2 id="proxima-familia-titulo">A seguir</h2></div></div>
          {proximaGlobal ? (
            <Link href={`/aluno/${proximaGlobal.aluno_id}/horario`}>
              <time>{formatarHora(proximaGlobal.horarios!.hora_inicio)}</time><span className="partitura-marca" aria-hidden="true" />
              <span><small>{rotuloDoDia(proximaGlobal.data, proximaGlobal.horarios!.dia_semana)}</small><strong>{proximaGlobal.instrumentos?.nome}</strong><b>{proximaGlobal.alunos?.nome}{formatarSala(proximaGlobal.horarios!.salas) ? ` · ${formatarSala(proximaGlobal.horarios!.salas)}` : ''}</b></span><i aria-hidden="true">→</i>
            </Link>
          ) : <p className="partitura-vazio">Ainda não há aulas confirmadas.</p>}
        </section>

        <section className="familia-alunos" aria-labelledby="familia-alunos-titulo">
          <div className="partitura-seccao-cabecalho"><div><p className="partitura-indice">02</p><h2 id="familia-alunos-titulo">{meusAlunos.length === 1 ? 'O teu aluno' : 'Os teus alunos'}</h2></div></div>
          {/* Uma conta acabada de criar não tem alunos nenhuns — o registo
              deixou de os criar sozinho (migração 0025). Sem isto, a
              secção ficava a mostrar um título e mais nada, sem dizer o
              que falta nem por onde começar. */}
          {meusAlunos.length === 0 ? (
            <EmptyState
              titulo="Ainda não tens alunos associados."
              descricao="Adiciona a pessoa que vai frequentar as aulas."
              acao={
                <Link href="/dashboard/alunos" className="familia-adicionar-botao">
                  Adicionar aluno
                </Link>
              }
            />
          ) : (
            <div>
              {meusAlunos.map((aluno) => {
                const resumo = resumoDoFilho(aluno.id)
                return <Link key={aluno.id} href={`/aluno/${aluno.id}`}><strong>{aluno.nome}</strong><span>{resumo.proxima ? `${resumo.proxima.instrumentos?.nome} · ${rotuloDoDia(resumo.proxima.data, resumo.proxima.horarios!.dia_semana)}, ${formatarHora(resumo.proxima.horarios!.hora_inicio)}` : resumo.pendentes > 0 ? `${resumo.pendentes} ${resumo.pendentes === 1 ? 'pedido pendente' : 'pedidos pendentes'}` : 'Sem aulas marcadas'}</span>{resumo.pendentes > 0 && <small>A aguardar professor</small>}<i aria-hidden="true">→</i></Link>
              })}
            </div>
          )}
        </section>

        {/* A Home é a visão de família, não o sítio onde se gere quem são
            os alunos — o formulário que aqui estava mudou-se para
            /dashboard/alunos, junto da lista completa. */}
        {meusAlunos.length > 0 && (
          <div className="familia-adicionar">
            <Link href="/dashboard/alunos" className="familia-gerir">
              Gerir alunos<i aria-hidden="true">→</i>
            </Link>
          </div>
        )}
        <div className="partitura-instalacao"><InstalarCallout /></div>
      </div>
    </main>
  )
}
