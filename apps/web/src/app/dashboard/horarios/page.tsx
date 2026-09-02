import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import {
  cancelarMatricula,
  criarHorarios,
  apagarHorarios,
  bloquearHorarios,
  desbloquearHorarios,
} from '@/lib/actions/professor'
import { DIAS_SEMANA, duracaoDaAula, professorCriaHorarios, paraMinutos, formatarHora, type DiaSemana } from '@ccg/core'
import { BotaoSelecionarTodos } from '@/components/horarios-selecionar-todos'
import { BotaoBloquearSelecionados } from '@/components/horarios-bloquear-selecionados'
import { BotaoDesbloquearSelecionados } from '@/components/horarios-desbloquear-selecionados'
import { BotaoApagarHorariosSelecionados } from '@/components/horarios-apagar-selecionados'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { ChevronDown, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/empty-state'
import { MensagemErro } from '@/components/mensagem'
import { SubmitButton } from '@/components/submit-button'
import { HorariosToolbar } from '@/components/horarios-toolbar'
import type { HorarioEstado } from '@ccg/types'

type HorarioProfessor = {
  id: number
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fim: string
  estado: HorarioEstado
}

type Confirmado = {
  id: number
  horario_final_id: number | null
  instrumentos: { nome: string } | null
  alunos: {
    nome: string
    encarregado: { telefone: string | null } | null
  } | null
  horarios: { dia_semana: DiaSemana; hora_inicio: string; hora_fim: string } | null
}

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ erroHorarios?: string }>
}) {
  const { erroHorarios } = await searchParams

  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: horariosData }, { data: confirmadosData }] =
    await Promise.all([
      supabase.from('perfis_escola').select('tipo, programa').eq('id', user.id).single(),
      supabase
        .from('horarios')
        .select('id, dia_semana, hora_inicio, hora_fim, estado')
        .eq('professor_id', user.id)
        .order('dia_semana')
        .order('hora_inicio'),
      supabase
        .from('matriculas')
        .select(
          'id, horario_final_id, instrumentos(nome), alunos(nome, encarregado:profiles!alunos_encarregado_id_fkey(telefone)), horarios(dia_semana, hora_inicio, hora_fim)'
        )
        .eq('professor_id', user.id)
        .eq('estado', 'confirmado')
        .order('criado_em'),
    ])

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const duracao = duracaoDaAula(profile?.programa)
  const criaOsSeus = professorCriaHorarios(profile?.programa)

  const horarios = (horariosData ?? []) as unknown as HorarioProfessor[]
  const confirmados = (confirmadosData ?? []) as unknown as Confirmado[]

  const confirmadosPorHorario = new Map<number, string[]>()
  for (const c of confirmados) {
    if (!c.horario_final_id) continue
    const nomes = confirmadosPorHorario.get(c.horario_final_id) ?? []
    nomes.push(c.alunos?.nome ?? '')
    confirmadosPorHorario.set(c.horario_final_id, nomes)
  }

  // Grelha de horários do professor — só mostra as horas entre o horário
  // mais cedo e o mais tarde deste professor, não um intervalo fixo do
  // dia. A altura da hora é a mesma da página Semana, para as duas
  // grelhas da app se lerem à mesma escala.
  const ALTURA_HORA = 56
  const horariosPorDia = new Map<string, HorarioProfessor[]>()
  let primeiraHora = 0
  let horasGrade: number[] = []
  let alturaCorpo = 0

  if (horarios.length > 0) {
    primeiraHora = Math.floor(Math.min(...horarios.map((h) => paraMinutos(h.hora_inicio))) / 60)
    const ultimaHora = Math.ceil(Math.max(...horarios.map((h) => paraMinutos(h.hora_fim))) / 60)
    horasGrade = Array.from({ length: ultimaHora - primeiraHora }, (_, i) => primeiraHora + i)
    alturaCorpo = horasGrade.length * ALTURA_HORA

    for (const dia of DIAS_SEMANA) horariosPorDia.set(dia, [])
    for (const h of horarios) horariosPorDia.get(h.dia_semana)?.push(h)
    for (const dia of DIAS_SEMANA) {
      horariosPorDia.get(dia)?.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    }
  }

  const diasComHorarios = DIAS_SEMANA.filter((dia) => (horariosPorDia.get(dia)?.length ?? 0) > 0)
  const livres = horarios.filter(
    (h) => h.estado !== 'bloqueado' && !confirmadosPorHorario.has(h.id)
  ).length

  return (
    <main id="conteudo-principal" className="pinterest-horarios">
      <div className="pinterest-horarios-folha">
        <header className="pinterest-horarios-cabecalho">
          <Link href="/dashboard" className="pinterest-horarios-voltar" aria-label="Voltar ao início">
            <ChevronLeft size={23} aria-hidden="true" />
          </Link>
          <div>
            <h1>Horários</h1>
            <p>As horas em que dás aulas</p>
          </div>
        </header>

        {erroHorarios && (
          <div className="pinterest-horarios-mensagem">
            <MensagemErro>{erroHorarios}</MensagemErro>
          </div>
        )}

        {/* Três contagens reais dos mesmos dados da lista. "Livres" é o
            número que decide se vale a pena aceitar mais um pedido. */}
        <div className="pinterest-horarios-resumo">
          <div>
            <strong>{horarios.length}</strong>
            <span>{horarios.length === 1 ? 'horário' : 'horários'}</span>
          </div>
          <div>
            <strong>{livres}</strong>
            <span>{livres === 1 ? 'vaga livre' : 'vagas livres'}</span>
          </div>
          <div>
            <strong>{confirmados.length}</strong>
            <span>{confirmados.length === 1 ? 'aluno' : 'alunos'}</span>
          </div>
        </div>

        <form id="bloquear-horarios-form" action={bloquearHorarios} />
        <form id="desbloquear-horarios-form" action={desbloquearHorarios} />

        {horarios.length === 0 ? (
          <EmptyState
            titulo="Ainda não tens horários definidos"
            descricao={
              criaOsSeus
                ? 'Cria as tuas horas disponíveis mais abaixo, em “Criar horários”.'
                : 'Os horários da tua escola são definidos pela secretaria.'
            }
          />
        ) : (
          <>
            <section className="pinterest-horarios-seccao" aria-labelledby="semana-titulo">
              <h2 id="semana-titulo">A semana</h2>
              {/* Duas leituras da mesma semana, uma por largura de ecrã. A
                  grelha continua a ser a boa em ecrã largo: vê-se a semana
                  inteira e os buracos entre aulas, que é o que interessa a
                  quem gere disponibilidade. A 375 px só cabem três dias e
                  meio, e nove décimos das células estão vazias. */}
              <ol className="pinterest-horarios-dias" aria-label="Horários da semana, por dia">
                {diasComHorarios.map((dia) => (
                  <li key={dia}>
                    <h3>{dia}</h3>
                    <ul>
                      {horariosPorDia.get(dia)?.map((h) => {
                        const bloqueado = h.estado === 'bloqueado'
                        const alunos = confirmadosPorHorario.get(h.id)
                        return (
                          <li key={h.id}>
                            <Link
                              href={`/professor/horarios/${h.id}`}
                              data-bloqueado={bloqueado || undefined}
                            >
                              <time>{formatarHora(h.hora_inicio)}</time>
                              <span>
                                <strong>
                                  {formatarHora(h.hora_inicio)}–{formatarHora(h.hora_fim)}
                                </strong>
                                <small>
                                  {bloqueado
                                    ? 'Bloqueado'
                                    : alunos?.length
                                      ? alunos.join(', ')
                                      : 'Disponível'}
                                </small>
                              </span>
                              <ChevronRight size={19} aria-hidden="true" />
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              </ol>

              <div className="pinterest-horarios-grelha">
                <div
                  className="pinterest-semana-interior"
                  style={{ '--altura-hora': `${ALTURA_HORA}px` } as CSSProperties}
                >
                  <div className="pinterest-semana-regua">
                    <div className="pinterest-semana-regua-topo" />
                    <div className="pinterest-semana-regua-corpo" style={{ height: alturaCorpo }}>
                      {horasGrade.map((hora) => (
                        <span key={hora} style={{ height: ALTURA_HORA }}>
                          {hora}h
                        </span>
                      ))}
                    </div>
                  </div>
                  {diasComHorarios.map((dia) => (
                    <div key={dia} className="pinterest-semana-dia">
                      <div className="pinterest-semana-dia-topo">
                        <abbr title={dia}>{dia.slice(0, 3)}</abbr>
                      </div>
                      <div className="pinterest-semana-dia-corpo" style={{ height: alturaCorpo }}>
                        {horariosPorDia.get(dia)?.map((h) => {
                          const bloqueado = h.estado === 'bloqueado'
                          const alunos = confirmadosPorHorario.get(h.id)?.join(', ')
                          const estilo = {
                            top: ((paraMinutos(h.hora_inicio) - primeiraHora * 60) / 60) * ALTURA_HORA,
                            height:
                              ((paraMinutos(h.hora_fim) - paraMinutos(h.hora_inicio)) / 60) *
                              ALTURA_HORA,
                          } as CSSProperties
                          return (
                            <Link
                              key={h.id}
                              href={`/professor/horarios/${h.id}`}
                              className={`pinterest-semana-bloco ${bloqueado ? 'pinterest-semana-bloco-bloqueado' : alunos ? '' : 'pinterest-semana-bloco-livre'}`}
                              style={estilo}
                              title={alunos || (bloqueado ? 'Bloqueado' : 'Disponível')}
                            >
                              <time>{formatarHora(h.hora_inicio)}</time>
                              <small>{bloqueado ? 'Bloqueado' : alunos || 'Livre'}</small>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <details className="pinterest-horarios-painel">
              <summary>
                <span>
                  <strong>Editar vários de uma vez</strong>
                  <small>Bloquear, desbloquear ou apagar</small>
                </span>
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <div className="pinterest-horarios-painel-corpo">
                <div className="pinterest-horarios-selecionar">
                  <BotaoSelecionarTodos />
                </div>
                <div className="pinterest-horarios-edicao">
                  {DIAS_SEMANA.flatMap((dia) => horariosPorDia.get(dia) ?? []).map((h) => {
                    const alunos = confirmadosPorHorario.get(h.id)
                    return (
                      <div key={h.id} className="pinterest-horarios-linha">
                        <label>
                          <input
                            type="checkbox"
                            name="horarioIds"
                            value={h.id}
                            aria-label={`Selecionar ${h.dia_semana}, ${formatarHora(h.hora_inicio)}`}
                          />
                        </label>
                        <span>
                          <strong>
                            {h.dia_semana} · {formatarHora(h.hora_inicio)}–
                            {formatarHora(h.hora_fim)}
                          </strong>
                          <small>
                            {h.estado === 'bloqueado'
                              ? 'Bloqueado'
                              : alunos?.length
                                ? alunos.join(', ')
                                : 'Disponível'}
                          </small>
                        </span>
                        <Link
                          href={`/professor/horarios/${h.id}`}
                          aria-label={`Editar horário de ${h.dia_semana} às ${formatarHora(h.hora_inicio)}`}
                        >
                          <Pencil size={17} strokeWidth={1.8} aria-hidden="true" />
                        </Link>
                      </div>
                    )
                  })}
                </div>
                <HorariosToolbar>
                  <BotaoBloquearSelecionados />
                  <BotaoDesbloquearSelecionados />
                  <BotaoApagarHorariosSelecionados action={apagarHorarios} />
                </HorariosToolbar>
              </div>
            </details>
          </>
        )}

        {/* Em Bebés a grelha é montada pela secretaria: são aulas de
            grupo, decididas para a escola inteira e não professor a
            professor. Mostrar-lhe um formulário que a acção recusa era
            deixá-lo escrever meia hora de horários para levar com um
            erro no fim. */}
        {!criaOsSeus && (
          <p className="pinterest-horarios-nota">
            Os horários da tua escola são definidos pela secretaria. Fala com ela para abrir ou
            mudar horas.
          </p>
        )}

        {criaOsSeus && (
          <details className="pinterest-horarios-painel">
            <summary>
              <span>
                <strong>Criar horários</strong>
                <small>Acrescentar disponibilidade à semana</small>
              </span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="pinterest-horarios-painel-corpo">
              <p className="pinterest-horarios-ajuda">
                Os horários não são de uma disciplina — servem para qualquer uma das que ensinas.
                Preenche só os dias em que dás aulas e deixa os outros em branco. Só entre as 10h e
                as 22h.
                {duracao
                  ? ` Cada aula da tua escola dura ${duracao} minutos, e é assim que os blocos são criados.`
                  : ''}
              </p>
              <form action={criarHorarios} className="pinterest-horarios-criar">
                {DIAS_SEMANA.map((dia, i) => (
                  <div key={dia}>
                    <span>{dia}</span>
                    <input name={`inicio_${i}`} type="time" min="10:00" max="22:00" aria-label={`Início de ${dia}`} />
                    <i>até</i>
                    <input name={`fim_${i}`} type="time" min="10:00" max="22:00" aria-label={`Fim de ${dia}`} />
                  </div>
                ))}
                <SubmitButton textoAGuardar="A criar…" className="pinterest-horarios-criar-botao">
                  Criar horários
                </SubmitButton>
              </form>
            </div>
          </details>
        )}

        <section className="pinterest-horarios-seccao" aria-labelledby="alunos-titulo">
          <h2 id="alunos-titulo">
            Alunos confirmados<b>{confirmados.length}</b>
          </h2>
          {confirmados.length === 0 ? (
            <EmptyState
              titulo="Ainda não tens alunos confirmados"
              descricao="Aparecem aqui assim que confirmares um pedido."
            />
          ) : (
            <div className="pinterest-horarios-alunos">
              {confirmados.map((c) => (
                <article key={c.id} className="pinterest-horarios-aluno">
                  <span>
                    <strong>{c.alunos?.nome}</strong>
                    <small>
                      {c.instrumentos?.nome} ·{' '}
                      {c.horarios
                        ? `${c.horarios.dia_semana}, ${formatarHora(c.horarios.hora_inicio)}–${formatarHora(c.horarios.hora_fim)}`
                        : 'Sem horário associado'}
                    </small>
                  </span>
                  <BotaoAcaoDestruir
                    label="Cancelar"
                    titulo="Cancelar esta matrícula?"
                    mensagem={`${c.alunos?.nome ?? 'O aluno'} deixa de ter esta aula e a vaga volta a ficar livre.\n\nAs mensalidades já emitidas mantêm-se.`}
                    action={cancelarMatricula}
                  >
                    <input type="hidden" name="matriculaId" value={c.id} />
                  </BotaoAcaoDestruir>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
