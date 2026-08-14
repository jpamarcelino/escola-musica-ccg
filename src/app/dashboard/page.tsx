import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import { criarAlunoDependente } from '@/lib/actions/aluno'
import { InstalarCallout } from '@/components/instalar-callout'
import { SubmitButton } from '@/components/submit-button'
import { PaginaComHero, HeroSaudacao } from '@/components/hero-section'
import { AnelProgresso } from '@/components/anel-progresso'
import { TituloSeccao, LinhaLista, GrupoLista } from '@/components/lista'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { CampoTexto } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'
import { proximaOcorrenciaDoDia, hojeISO } from '@/lib/datas'
import { formatarHora } from '@/lib/horarios-grade'
import { DIAS_SEMANA } from '@/lib/dias-semana'

type AulaConfirmada = {
  id: number
  horario_final_id: number | null
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileRowData } = await supabase
    .from('profiles')
    .select('nome, perfis_escola(tipo, admin, programa)')
    .eq('id', user.id)
    .single()

  const profileRow = profileRowData as {
    nome: string
    perfis_escola: { tipo: string; admin: boolean; programa: string | null } | null
  } | null

  const profile = profileRow
    ? {
        nome: profileRow.nome,
        tipo: profileRow.perfis_escola?.tipo,
        admin: profileRow.perfis_escola?.admin,
        programa: profileRow.perfis_escola?.programa,
      }
    : null

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
            'id, horario_final_id, alunos(nome), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim)'
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
        const data = proximaOcorrenciaDoDia(c.horarios!.dia_semana)
        return { ...c, data }
      })
      .sort((a, b) =>
        a.data === b.data
          ? a.horarios!.hora_inicio.localeCompare(b.horarios!.hora_inicio)
          : a.data.localeCompare(b.data)
      )
      .slice(0, 3)

    return (
      <PaginaComHero
          comBottomNav
          hero={
            <div className="flex flex-col items-center gap-[24px]">
              <div className="w-full">
                <HeroSaudacao
                  nome={primeiroNome}
                  contexto={
                    profile.programa
                      ? `Escola de ${profile.programa === 'musica' ? 'Música' : 'Dança'}`
                      : undefined
                  }
                />
              </div>
              {ocupacao !== null ? (
                <AnelProgresso
                  valor={ocupacao}
                  numero={`${ocupacao}%`}
                  label="Ocupação da agenda"
                  legenda={`${horariosOcupados.size} de ${horariosAtivos.length} horários`}
                />
              ) : (
                <p className="text-[15px]">
                  Ainda não tens horários definidos — cria-os para começares a
                  receber pedidos.
                </p>
              )}
            </div>
          }
        >
          <InstalarCallout />

          <TituloSeccao>Próximas aulas</TituloSeccao>
          {proximas.length === 0 ? (
            <p className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
              Sem aulas confirmadas por agora.
            </p>
          ) : (
            <GrupoLista>
              {proximas.map((aula) => (
                <LinhaLista
                  key={aula.id}
                  href={`/dashboard/agenda/${aula.horario_final_id}`}
                  titulo={`${aula.instrumentos?.nome} — ${aula.alunos?.nome}`}
                  contexto={`${rotuloDoDia(aula.data, aula.horarios!.dia_semana)}, ${formatarHora(aula.horarios!.hora_inicio)}–${formatarHora(aula.horarios!.hora_fim)}`}
                />
              ))}
            </GrupoLista>
          )}

          {(pedidosPendentes ?? 0) > 0 && (
            <>
              <TituloSeccao contagem={pedidosPendentes ?? 0}>
                Pedidos por responder
              </TituloSeccao>
              <LinhaLista
                href="/dashboard/pedidos"
                titulo="Ver os pedidos de aula"
                contexto="Novos alunos à espera de horário"
              />
            </>
          )}

          <TituloSeccao>Gestão</TituloSeccao>
          <GrupoLista>
            <LinhaLista href="/dashboard/presencas" titulo="Presenças" />
            <LinhaLista href="/dashboard/horarios" titulo="Gestão de Horários" />
            <LinhaLista href="/dashboard/calendario" titulo="Calendário Escolar" />
          </GrupoLista>

          <form action={logout} className="flex justify-center pt-[32px]">
            <LigacaoTerciaria>Sair</LigacaoTerciaria>
          </form>
      </PaginaComHero>
    )
  }

  /* ------------------------------------------------------------------ */
  /* ENCARREGADO / ALUNO                                                 */
  /* ------------------------------------------------------------------ */
  type MatriculaFilho = {
    id: number
    aluno_id: string
    estado: string
    instrumentos: { nome: string } | null
    horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
  }

  // As duas consultas correm em paralelo: as matrículas filtram-se pelo
  // encarregado através do join a "alunos" (!inner), em vez de esperar
  // pela lista de ids da primeira consulta. Poupa um ida-e-volta à base
  // de dados no carregamento da Home.
  const [{ data: meusAlunosData }, { data: matriculasData }] = await Promise.all([
    supabase.from('alunos').select('id, nome').eq('encarregado_id', user.id).order('criado_em'),
    supabase
      .from('matriculas')
      .select(
        'id, aluno_id, estado, instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim), alunos!inner(encarregado_id)'
      )
      .eq('alunos.encarregado_id', user.id)
      .in('estado', ['a_escolher', 'confirmado']),
  ])
  const meusAlunos = meusAlunosData ?? []
  const matriculas = (matriculasData ?? []) as unknown as MatriculaFilho[]

  const confirmadasFilhos = matriculas.filter((m) => m.estado === 'confirmado' && m.horarios)

  // O anel de cada filho mostra o progresso da semana — quantas das aulas
  // desta semana já decorreram. Não é assiduidade: a RLS das presenças
  // (migração 0002) esconde-as deliberadamente do encarregado, e inventar
  // outra métrica só para encher o círculo seria pior do que não o ter.
  // Isto usa apenas dados que o encarregado já vê (horários semanais) e é
  // uma proporção genuína, que avança ao longo da semana.
  const indiceHoje = (new Date().getDay() + 6) % 7

  function resumoDoFilho(alunoId: string) {
    const doFilho = confirmadasFilhos
      .filter((m) => m.aluno_id === alunoId)
      .map((m) => ({ ...m, data: proximaOcorrenciaDoDia(m.horarios!.dia_semana) }))
      .sort((a, b) =>
        a.data === b.data
          ? a.horarios!.hora_inicio.localeCompare(b.horarios!.hora_inicio)
          : a.data.localeCompare(b.data)
      )
    const proxima = doFilho[0] ?? null

    const aulasSemana = confirmadasFilhos.filter((m) => m.aluno_id === alunoId)
    const jaDecorridas = aulasSemana.filter(
      (m) => DIAS_SEMANA.indexOf(m.horarios!.dia_semana) < indiceHoje
    ).length
    const semana =
      aulasSemana.length > 0
        ? {
            decorridas: jaDecorridas,
            total: aulasSemana.length,
            percentagem: Math.round((jaDecorridas / aulasSemana.length) * 100),
          }
        : null

    const pendentes = matriculas.filter(
      (m) => m.aluno_id === alunoId && m.estado === 'a_escolher'
    ).length

    return { proxima, semana, pendentes }
  }

  const totalAulasSemana = confirmadasFilhos.length
  const umSoFilho = meusAlunos.length === 1
  const filhoUnico = umSoFilho ? meusAlunos[0] : null
  const resumoUnico = filhoUnico ? resumoDoFilho(filhoUnico.id) : null

  return (
    <PaginaComHero
        comBottomNav
        hero={
          <div className="space-y-[20px]">
            <HeroSaudacao nome={primeiroNome} />
            <div>
              <p
                className="text-[56px] font-bold leading-[1]"
                style={{ fontFamily: 'var(--font-fraunces)' }}
              >
                {totalAulasSemana}
              </p>
              <p className="mt-[4px] text-[15px]">
                {totalAulasSemana === 1 ? 'aula esta semana' : 'aulas esta semana'}
              </p>
            </div>
          </div>
        }
      >
        {erro && <MensagemErro>{erro}</MensagemErro>}

        <InstalarCallout />

        {/* Um só filho: resumo direto na Home, sem passo intermédio. */}
        {filhoUnico && resumoUnico && (
          <>
            <TituloSeccao
              acao={
                <LigacaoTerciaria href={`/aluno/${filhoUnico.id}`}>Ver tudo</LigacaoTerciaria>
              }
            >
              {filhoUnico.nome}
            </TituloSeccao>
            <GrupoLista>
              {resumoUnico.proxima ? (
                <LinhaLista
                  href={`/aluno/${filhoUnico.id}/horario`}
                  titulo={`Próxima aula: ${resumoUnico.proxima.instrumentos?.nome}`}
                  contexto={`${rotuloDoDia(resumoUnico.proxima.data, resumoUnico.proxima.horarios!.dia_semana)}, ${formatarHora(resumoUnico.proxima.horarios!.hora_inicio)}`}
                  direita={
                    resumoUnico.semana ? (
                      <AnelProgresso
                        tamanho="pequeno"
                        valor={resumoUnico.semana.percentagem}
                        numero={`${resumoUnico.semana.decorridas}/${resumoUnico.semana.total}`}
                        label="Aulas desta semana já dadas"
                      />
                    ) : undefined
                  }
                />
              ) : (
                <LinhaLista
                  href={`/aluno/${filhoUnico.id}/pedido`}
                  titulo="Ainda sem aulas confirmadas"
                  contexto="Pede a primeira aula aqui"
                />
              )}
              {resumoUnico.pendentes > 0 && (
                <LinhaLista
                  href={`/aluno/${filhoUnico.id}/horario`}
                  titulo={`${resumoUnico.pendentes} ${resumoUnico.pendentes === 1 ? 'pedido pendente' : 'pedidos pendentes'}`}
                  contexto="A aguardar confirmação do professor"
                />
              )}
            </GrupoLista>
          </>
        )}

        {/* Vários filhos: um cartão por filho, cada um com o seu anel. */}
        {!umSoFilho && meusAlunos.length > 0 && (
          <>
            <TituloSeccao>Os teus alunos</TituloSeccao>
            <GrupoLista>
              {meusAlunos.map((aluno) => {
                const resumo = resumoDoFilho(aluno.id)
                return (
                  <LinhaLista
                    key={aluno.id}
                    href={`/aluno/${aluno.id}`}
                    titulo={aluno.nome}
                    contexto={
                      resumo.proxima
                        ? `${resumo.proxima.instrumentos?.nome} — ${rotuloDoDia(resumo.proxima.data, resumo.proxima.horarios!.dia_semana)}, ${formatarHora(resumo.proxima.horarios!.hora_inicio)}`
                        : resumo.pendentes > 0
                          ? `${resumo.pendentes} ${resumo.pendentes === 1 ? 'pedido pendente' : 'pedidos pendentes'}`
                          : 'Sem aulas marcadas'
                    }
                    direita={
                      resumo.semana ? (
                        <AnelProgresso
                          tamanho="pequeno"
                          valor={resumo.semana.percentagem}
                          numero={`${resumo.semana.decorridas}/${resumo.semana.total}`}
                          label="Aulas desta semana já dadas"
                        />
                      ) : undefined
                    }
                  />
                )
              })}
            </GrupoLista>
          </>
        )}

        <TituloSeccao>Adicionar aluno</TituloSeccao>
        <form action={criarAlunoDependente} className="space-y-[14px]">
          <CampoTexto id="nome" name="nome" label="Nome do aluno" />
          <CampoTexto
            id="dataNascimento"
            name="dataNascimento"
            label="Data de nascimento"
            type="date"
            required={false}
          />
          <SubmitButton
            textoAGuardar="A adicionar..."
            className="flex h-[56px] w-full items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] text-[15.5px] font-semibold text-[var(--color-ink)] disabled:opacity-50"
          >
            Adicionar Aluno
          </SubmitButton>
        </form>

        <form action={logout} className="flex justify-center pt-[32px]">
          <LigacaoTerciaria>Sair</LigacaoTerciaria>
        </form>
    </PaginaComHero>
  )
}
