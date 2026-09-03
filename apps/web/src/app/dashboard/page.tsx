import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { MensagemErro } from '@/components/mensagem'
import { EmptyState } from '@/components/empty-state'
import { agoraNaEscola, estadoTemporalAula, proximaAulaPorAcontecer, hojeISO, formatarHora, formatarSala, DIAS_SEMANA, type DiaSemana } from '@ccg/core'
import type { MatriculaEstado } from '@ccg/types'
import { Baby, Bell, CalendarDays, ChevronRight, ClipboardCheck, Clock3, Inbox, MessageSquare, Music2, Plus, RefreshCw, Send, UserRoundCog, UsersRound, WalletCards } from 'lucide-react'
import { daAlgumaTurmaDeBebes } from '@/lib/bebes'

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

    // O separador dos Bebés só existe para quem dá pelo menos uma turma.
    const daBebes = await daAlgumaTurmaDeBebes(supabase, user.id)

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

    return (
      <main id="conteudo-principal" className="pinterest-home pinterest-professor-home">
        <div className="pinterest-home-folha">
          <header className="pinterest-home-cabecalho">
            <div>
              <h1>Olá, {primeiroNome}</h1>
              <p>O teu dia na escola.</p>
            </div>
            <span className="pinterest-home-avatar" aria-hidden="true">{primeiroNome.slice(0, 1).toUpperCase()}</span>
          </header>

          {erro && <MensagemErro>{erro}</MensagemErro>}

          {presencasPorConfirmar > 0 && (
            <Link href="/dashboard/presencas/confirmar" className="pinterest-home-alerta">
              <ClipboardCheck size={19} strokeWidth={1.8} aria-hidden="true" />
              <span><strong>{presencasPorConfirmar === 1 ? '1 presença por confirmar' : `${presencasPorConfirmar} presenças por confirmar`}</strong><small>De aulas que já terminaram hoje.</small></span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          )}

          <div className="pinterest-home-dashboard-grid pinterest-home-dashboard-grid-professor">
          <section className="pinterest-home-seccao pinterest-home-painel-principal" aria-labelledby="titulo-proximas">
            <div className="pinterest-home-seccao-topo"><h2 id="titulo-proximas">Próxima aula</h2><Link href="/dashboard/agenda">Ver agenda <ChevronRight size={17} aria-hidden="true" /></Link></div>

            {proximas.length === 0 ? (
              <div className="pinterest-aula pinterest-aula-vazia"><span className="pinterest-aula-icone"><Music2 size={24} aria-hidden="true" /></span><strong>{ocupacao === null ? 'Ainda não tens horários definidos' : 'Hoje não tens mais aulas marcadas'}</strong><Link href="/dashboard/horarios">Ver horários</Link></div>
            ) : (
              <>
                {proximas.slice(0, 1).map((aula) => {
                  const sala = formatarSala(aula.horarios!.salas)
                  const estadoTemporal = estadoTemporalAula(aula.data, aula.horarios!.hora_inicio, aula.horarios!.hora_fim, agora)
                  return (
                    <Link key={aula.id} href={`/dashboard/agenda/${aula.horario_final_id}`} className="pinterest-aula pinterest-professor-proxima">
                      <span className="pinterest-aula-icone"><Music2 size={24} strokeWidth={1.8} aria-hidden="true" /></span>
                      <span className="pinterest-aula-data">{estadoTemporal === 'agora' ? 'Agora' : rotuloDoDia(aula.data, aula.horarios!.dia_semana)} · {formatarHora(aula.horarios!.hora_inicio)}–{formatarHora(aula.horarios!.hora_fim)}</span>
                      <strong>{aula.alunos?.nome}</strong>
                      <span className="pinterest-aula-aluno">{aula.instrumentos?.nome}{sala ? ` · ${sala}` : ''}</span>
                      <ChevronRight className="pinterest-aula-seta" size={22} aria-hidden="true" />
                    </Link>
                  )
                })}
                {proximas.length > 1 && <div className="pinterest-professor-seguintes">{proximas.slice(1).map((aula) => <Link key={aula.id} href={`/dashboard/agenda/${aula.horario_final_id}`}><time>{formatarHora(aula.horarios!.hora_inicio)}</time><span><strong>{aula.alunos?.nome}</strong><small>{rotuloDoDia(aula.data, aula.horarios!.dia_semana)} · {aula.instrumentos?.nome}</small></span><ChevronRight size={18} aria-hidden="true" /></Link>)}</div>}
              </>
            )}
          </section>

          <section className="pinterest-home-seccao pinterest-home-painel-atalhos" aria-labelledby="professor-atalhos-titulo">
            <div className="pinterest-home-seccao-topo"><h2 id="professor-atalhos-titulo">Acesso rápido</h2></div>
            <nav className="pinterest-atalhos pinterest-professor-atalhos" aria-label="Ações frequentes">
              <Link href="/dashboard/presencas"><span><ClipboardCheck size={22} aria-hidden="true" /></span><strong>Presenças</strong><small>Registar aulas</small></Link>
              <Link href="/dashboard/pedidos"><span><Inbox size={22} aria-hidden="true" /></span><strong>Pedidos</strong><small>{(pedidosPendentes ?? 0) > 0 ? `${pedidosPendentes} por responder` : 'Nada pendente'}</small></Link>
              <Link href="/dashboard/meus-alunos"><span><UsersRound size={22} aria-hidden="true" /></span><strong>Alunos</strong><small>Perfis e dados</small></Link>
              <Link href="/dashboard/agenda"><span><CalendarDays size={22} aria-hidden="true" /></span><strong>Agenda</strong><small>Próximas aulas</small></Link>
            </nav>
          </section>

          <section className="pinterest-home-seccao pinterest-home-painel-gestao" aria-labelledby="titulo-gestao">
            <div className="pinterest-home-seccao-topo"><h2 id="titulo-gestao">Gestão</h2></div>
            <nav className="pinterest-professor-gestao" aria-label="Ferramentas de gestão">
              <Link href="/dashboard/horarios"><span><Clock3 size={20} aria-hidden="true" /></span><strong>Horários</strong><ChevronRight size={18} aria-hidden="true" /></Link>
              <Link href="/dashboard/mensagens"><span><MessageSquare size={20} aria-hidden="true" /></span><strong>Mensagens</strong><ChevronRight size={18} aria-hidden="true" /></Link>
              <Link href="/dashboard/enviar-material"><span><Send size={20} aria-hidden="true" /></span><strong>Enviar material</strong><ChevronRight size={18} aria-hidden="true" /></Link>
              <Link href="/dashboard/mensalidades"><span><WalletCards size={20} aria-hidden="true" /></span><strong>Mensalidades</strong><ChevronRight size={18} aria-hidden="true" /></Link>
              {profile.programa === 'musica' && <Link href="/dashboard/reposicoes"><span><RefreshCw size={20} aria-hidden="true" /></span><strong>Reposições</strong><ChevronRight size={18} aria-hidden="true" /></Link>}
              {/* Só a quem dá pelo menos uma turma. Não é uma área da
                  escola aberta a todos os professores — é a página de
                  quem lá dá aulas. */}
              {daBebes && <Link href="/dashboard/bebes"><span><Baby size={20} aria-hidden="true" /></span><strong>Música para Bebés</strong><ChevronRight size={18} aria-hidden="true" /></Link>}
            </nav>
          </section>
          </div>
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

  // Quantas decisões esperam por esta conta. O aviso do topo levava
  // sempre aos Avisos, que repetem a mensagem e não deixam responder —
  // ler duas vezes a mesma frase e continuar sem saber onde carregar.
  // Havendo o que decidir, leva à agenda, que é onde se responde.
  const idsDosAlunos = meusAlunos.map((a) => a.id)
  const [{ count: propostasPendentes }, { count: reposicoesPropostas }] =
    idsDosAlunos.length > 0
      ? await Promise.all([
          supabase
            .from('propostas_horario')
            .select('id', { count: 'exact', head: true })
            .in('aluno_id', idsDosAlunos)
            .eq('estado', 'pendente'),
          supabase
            .from('reposicoes')
            .select('id', { count: 'exact', head: true })
            .in('aluno_id', idsDosAlunos)
            .eq('estado', 'proposta'),
        ])
      : [{ count: 0 }, { count: 0 }]

  const porDecidir = (propostasPendentes ?? 0) + (reposicoesPropostas ?? 0)

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

  return (
    <main id="conteudo-principal" className="pinterest-home">
      <div className="pinterest-home-folha">
        <header className="pinterest-home-cabecalho">
          <div>
            <h1>Olá, {primeiroNome}</h1>
            <p>O que se segue na tua escola.</p>
          </div>
          <span className="pinterest-home-avatar" aria-hidden="true">
            {primeiroNome.slice(0, 1).toUpperCase()}
          </span>
        </header>

        {erro && <MensagemErro>{erro}</MensagemErro>}

        {porDecidir > 0 ? (
          <Link href="/dashboard/agenda" className="pinterest-home-alerta">
            <Bell size={19} strokeWidth={1.8} aria-hidden="true" />
            <span><strong>{porDecidir === 1 ? 'Precisa da tua resposta' : `${porDecidir} respostas pendentes`}</strong><small>Vê a proposta do professor.</small></span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ) : (
          avisoMaisRecente && (
            <Link href="/dashboard/avisos" className="pinterest-home-alerta">
              <Bell size={19} strokeWidth={1.8} aria-hidden="true" />
              <span><strong>Novo aviso</strong><small>{avisoMaisRecente.mensagem}</small></span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          )
        )}

        <div className="pinterest-home-dashboard-grid pinterest-home-dashboard-grid-familia">
        <section className="pinterest-home-seccao pinterest-home-painel-principal" aria-labelledby="proxima-familia-titulo">
          <div className="pinterest-home-seccao-topo"><h2 id="proxima-familia-titulo">Próxima aula</h2><Link href="/dashboard/agenda">Ver agenda <ChevronRight size={17} aria-hidden="true" /></Link></div>
          {proximaGlobal ? (
            <Link href={`/aluno/${proximaGlobal.aluno_id}/horario`} className="pinterest-aula">
              <span className="pinterest-aula-icone"><Music2 size={24} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="pinterest-aula-data">{rotuloDoDia(proximaGlobal.data, proximaGlobal.horarios!.dia_semana)} · {formatarHora(proximaGlobal.horarios!.hora_inicio)}–{formatarHora(proximaGlobal.horarios!.hora_fim)}</span>
              <strong>{proximaGlobal.instrumentos?.nome}</strong>
              <span className="pinterest-aula-aluno">{proximaGlobal.alunos?.nome}{formatarSala(proximaGlobal.horarios!.salas) ? ` · ${formatarSala(proximaGlobal.horarios!.salas)}` : ''}</span>
              <ChevronRight className="pinterest-aula-seta" size={22} aria-hidden="true" />
            </Link>
          ) : <div className="pinterest-aula pinterest-aula-vazia"><span className="pinterest-aula-icone"><Music2 size={24} aria-hidden="true" /></span><strong>Ainda não há aulas confirmadas</strong><Link href="/pedir-aula">Pedir uma aula</Link></div>}
        </section>

        <section className="pinterest-home-seccao pinterest-home-painel-alunos" aria-labelledby="familia-alunos-titulo">
          <div className="pinterest-home-seccao-topo"><h2 id="familia-alunos-titulo">{meusAlunos.length === 1 ? 'O teu aluno' : 'Os teus alunos'}</h2><Link href="/dashboard/alunos">Gerir <ChevronRight size={17} aria-hidden="true" /></Link></div>
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
            <div className="pinterest-alunos">
              {meusAlunos.map((aluno) => {
                const resumo = resumoDoFilho(aluno.id)
                return <Link key={aluno.id} href={`/aluno/${aluno.id}`}><span className="pinterest-aluno-avatar" aria-hidden="true">{aluno.nome.trim().slice(0, 1).toUpperCase()}</span><span><strong>{aluno.nome}</strong><small>{resumo.proxima ? `${resumo.proxima.instrumentos?.nome} · ${rotuloDoDia(resumo.proxima.data, resumo.proxima.horarios!.dia_semana)}, ${formatarHora(resumo.proxima.horarios!.hora_inicio)}` : resumo.pendentes > 0 ? `${resumo.pendentes} ${resumo.pendentes === 1 ? 'pedido pendente' : 'pedidos pendentes'}` : 'Sem aulas marcadas'}</small></span>{resumo.pendentes > 0 && <b>A aguardar</b>}<ChevronRight size={19} aria-hidden="true" /></Link>
              })}
            </div>
          )}
        </section>

        <section className="pinterest-home-seccao pinterest-home-painel-atalhos" aria-labelledby="atalhos-titulo">
          <div className="pinterest-home-seccao-topo"><h2 id="atalhos-titulo">Acesso rápido</h2></div>
          <nav className="pinterest-atalhos" aria-label="Ações da conta">
            <Link href="/dashboard/alunos"><span><UserRoundCog size={22} aria-hidden="true" /></span><strong>Gerir alunos</strong><small>Perfis e dados</small></Link>
            <Link href="/dashboard/mensalidades"><span><WalletCards size={22} aria-hidden="true" /></span><strong>Mensalidades</strong><small>Pagamentos</small></Link>
            <Link href="/dashboard/agenda"><span><CalendarDays size={22} aria-hidden="true" /></span><strong>Agenda</strong><small>Próximas aulas</small></Link>
            <Link href="/dashboard/avisos"><span><Bell size={22} aria-hidden="true" /></span><strong>Avisos</strong><small>Novidades</small></Link>
          </nav>
        </section>

        {/* Pedir uma aula vivia no fundo do horário de cada aluno — três
            toques abaixo desta página, e depois de percorrer a lista de
            aulas toda. É das poucas coisas aqui que traz dinheiro à
            escola, e estava onde só chegava quem já sabia o caminho.
            Fica em último de propósito: é uma ação de vez em quando, não
            um atalho do dia a dia.

            Com um aluno vai direto ao pedido. Com mais do que um há uma
            pergunta a fazer primeiro — para quem — e ela abre-se aqui,
            num <details>, em vez de mandar a pessoa a um ecrã só para
            escolher um nome. Sem alunos não aparece: a secção acima já
            está a pedir que se adicione um. */}
        {meusAlunos.length === 1 ? (
          <Link href={`/aluno/${meusAlunos[0].id}/pedido`} className="pinterest-pedir-aula">
            <span aria-hidden="true"><Plus size={20} /></span>
            <span>
              <strong>Pedir uma aula</strong>
              <small>Escolher disciplina, professor e disponibilidade</small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ) : meusAlunos.length > 1 ? (
          <details className="pinterest-pedir-aula-grupo">
            <summary>
              <span aria-hidden="true"><Plus size={20} /></span>
              <span>
                <strong>Pedir uma aula</strong>
                <small>Escolher disciplina, professor e disponibilidade</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </summary>
            <div>
              <p>Para quem?</p>
              {meusAlunos.map((aluno) => (
                <Link key={aluno.id} href={`/aluno/${aluno.id}/pedido`}>
                  <span aria-hidden="true">{aluno.nome.trim().slice(0, 1).toUpperCase()}</span>
                  <strong>{aluno.nome}</strong>
                  <ChevronRight size={17} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </details>
        ) : null}
        </div>
      </div>
    </main>
  )
}
