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
import { DIAS_SEMANA } from '@/lib/dias-semana'
import { HOUR_HEIGHT, paraMinutos, formatarHora } from '@/lib/horarios-grade'
import { BotaoSelecionarTodos } from '@/components/horarios-selecionar-todos'
import { BotaoBloquearSelecionados } from '@/components/horarios-bloquear-selecionados'
import { BotaoDesbloquearSelecionados } from '@/components/horarios-desbloquear-selecionados'
import { BotaoApagarHorariosSelecionados } from '@/components/horarios-apagar-selecionados'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/empty-state'
import { MensagemErro } from '@/components/mensagem'
import { SubmitButton } from '@/components/submit-button'
import { HorariosToolbar } from '@/components/horarios-toolbar'

type HorarioProfessor = {
  id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  estado: string
}

type Confirmado = {
  id: number
  horario_final_id: number | null
  instrumentos: { nome: string } | null
  alunos: {
    nome: string
    encarregado: { telefone: string | null } | null
  } | null
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
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
      supabase.from('perfis_escola').select('tipo').eq('id', user.id).single(),
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
  // mais cedo e o mais tarde deste professor, não um intervalo fixo do dia.
  const horariosPorDia = new Map<string, HorarioProfessor[]>()
  const indicePorHorario = new Map<number, number>()
  let horaInicioGrade = 0
  let horasGrade: number[] = []
  let alturaGrade = 0

  if (horarios.length > 0) {
    horaInicioGrade = Math.floor(
      Math.min(...horarios.map((h) => paraMinutos(h.hora_inicio))) / 60
    )
    const horaFimGrade = Math.ceil(
      Math.max(...horarios.map((h) => paraMinutos(h.hora_fim))) / 60
    )
    horasGrade = Array.from(
      { length: horaFimGrade - horaInicioGrade },
      (_, i) => horaInicioGrade + i
    )
    alturaGrade = horasGrade.length * HOUR_HEIGHT

    for (const dia of DIAS_SEMANA) horariosPorDia.set(dia, [])
    for (const h of horarios) horariosPorDia.get(h.dia_semana)?.push(h)
    for (const dia of DIAS_SEMANA) {
      horariosPorDia.get(dia)?.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    }

    let indiceAtual = 0
    for (const dia of DIAS_SEMANA) {
      for (const h of horariosPorDia.get(dia) ?? []) {
        indicePorHorario.set(h.id, indiceAtual)
        indiceAtual += 1
      }
    }
  }

  return (
    <main id="conteudo-principal" className="partitura-pagina horarios-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">←</Link>
          <div>
            <p className="partitura-sobretitulo">A tua semana</p>
            <h1>Horários</h1>
            <p>{horarios.length} {horarios.length === 1 ? 'horário definido' : 'horários definidos'} · {confirmados.length} {confirmados.length === 1 ? 'aluno confirmado' : 'alunos confirmados'}</p>
          </div>
        </header>

        {erroHorarios && (
          <MensagemErro>{erroHorarios}</MensagemErro>
        )}

        <section className="partitura-seccao" aria-labelledby="semana-titulo">
          <div className="partitura-seccao-cabecalho">
            <div><p className="partitura-indice">01</p><h2 id="semana-titulo">Grelha semanal</h2></div>
          </div>
          <form id="bloquear-horarios-form" action={bloquearHorarios} />
          <form id="desbloquear-horarios-form" action={desbloquearHorarios} />
          {horarios.length === 0 ? (
            <EmptyState
              titulo="Ainda não tens horários definidos"
              descricao="Cria os teus horários disponíveis mais abaixo, em “Criar horários”."
            />
          ) : (
            <>
              <div className="horarios-grade partitura-grade" aria-label="Grelha semanal dos horários">
                <div className="horarios-coluna-horas">
                  <div className="horarios-coluna-horas-cabecalho" />
                  {horasGrade.map((hora) => <div key={hora} className="horarios-hora-label" style={{ height: HOUR_HEIGHT }}>{hora}h</div>)}
                </div>
                {DIAS_SEMANA.map((dia) => (
                  <div key={dia} className="horarios-coluna-dia">
                    <div className="horarios-coluna-dia-cabecalho">{dia.slice(0, 3)}</div>
                    <div className="horarios-coluna-dia-corpo" style={{ height: alturaGrade, backgroundImage: `repeating-linear-gradient(to bottom, rgba(27,79,122,.11) 0, rgba(27,79,122,.11) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)` }}>
                      {horariosPorDia.get(dia)?.map((h) => {
                        const inicioMin = paraMinutos(h.hora_inicio)
                        const fimMin = paraMinutos(h.hora_fim)
                        const bloqueado = h.estado === 'bloqueado'
                        const alunos = confirmadosPorHorario.get(h.id)?.join(', ')
                        const estilo = { top: ((inicioMin - horaInicioGrade * 60) / 60) * HOUR_HEIGHT, height: ((fimMin - inicioMin) / 60) * HOUR_HEIGHT, '--card-index': indicePorHorario.get(h.id) ?? 0 } as CSSProperties
                        return <Link key={h.id} href={`/professor/horarios/${h.id}`} className={`horario-bloco entrada-esquerda${bloqueado ? ' bloqueado-selecionavel' : ''}`} style={estilo} title={alunos || (bloqueado ? 'Bloqueado' : 'Disponível')}><span>{formatarHora(h.hora_inicio)}</span>{alunos && <span className="horario-bloco-alunos">{alunos}</span>}</Link>
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <details className="horarios-edicao">
                <summary>Editar horários individualmente</summary>
                <p>Seleciona os horários que queres alterar ou abre um deles para editar a hora.</p>
              <div className="horarios-selecionar-todos"><BotaoSelecionarTodos /></div>
              <div className="horarios-lista-edicao">
                {DIAS_SEMANA.flatMap((dia) => horariosPorDia.get(dia) ?? []).map((h) => {
                  const alunos = confirmadosPorHorario.get(h.id)
                  return (
                    <div key={h.id} className="horarios-linha-edicao">
                      <label className="horarios-checkbox">
                        <input
                          type="checkbox"
                          name="horarioIds"
                          value={h.id}
                          aria-label={`Selecionar ${h.dia_semana}, ${formatarHora(h.hora_inicio)}`}
                          className="h-[22px] w-[22px] accent-[var(--color-azul-fundo)]"
                        />
                      </label>
                      <span className="horarios-linha-texto">
                        <strong>{h.dia_semana} · {formatarHora(h.hora_inicio)}–{formatarHora(h.hora_fim)}</strong>
                        <small>{h.estado === 'bloqueado' ? 'Bloqueado' : alunos?.length ? alunos.join(', ') : 'Disponível'}</small>
                      </span>
                      <Link
                        href={`/professor/horarios/${h.id}`}
                        aria-label={`Editar horário de ${h.dia_semana} às ${formatarHora(h.hora_inicio)}`}
                        className="horarios-editar-link"
                      >
                        <Pencil size={18} strokeWidth={1.5} aria-hidden="true" />
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
              </details>
            </>
          )}
        </section>

        <details className="horarios-criar">
          <summary><span><b>02</b><strong>Criar horários</strong></span><small>Adicionar disponibilidade à semana</small></summary>
          <section className="horarios-criar-corpo">
          <p className="text-xs text-foreground/50">
            Os horários não são específicos de uma disciplina — servem para
            qualquer uma das que ensinas. Preenche só os dias em que dás
            aulas; deixa os outros em branco. Só entre as 10h e as 22h.
          </p>
          <form
            action={criarHorarios}
            className="space-y-3"
          >
            <div className="space-y-2">
              {DIAS_SEMANA.map((dia, i) => (
                <div key={dia} className="grid grid-cols-[64px_1fr_24px_1fr] items-center gap-2">
                  <span className="w-16 shrink-0 text-sm">{dia}</span>
                  <input
                    name={`inicio_${i}`}
                    type="time"
                    min="10:00"
                    max="22:00"
                    className="min-h-[48px] w-full rounded-[12px] border border-foreground/20 bg-background px-2 text-sm"
                  />
                  <span className="text-sm text-foreground/50">até</span>
                  <input
                    name={`fim_${i}`}
                    type="time"
                    min="10:00"
                    max="22:00"
                    className="min-h-[48px] w-full rounded-[12px] border border-foreground/20 bg-background px-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label htmlFor="duracaoMinutos" className="block text-sm font-medium">
                Duração de cada aula (minutos)
              </label>
              <input
                id="duracaoMinutos"
                name="duracaoMinutos"
                type="number"
                min={5}
                step={5}
                defaultValue={50}
                required
                inputMode="numeric"
                className="min-h-[48px] w-full rounded-[12px] border border-foreground/20 bg-background px-3 text-sm"
              />
            </div>

            <SubmitButton
              textoAGuardar="A criar…"
              className="horarios-criar-botao"
            >
              Criar horários
            </SubmitButton>
          </form>
          </section>
        </details>

        <section className="partitura-seccao" aria-labelledby="alunos-titulo">
          <div className="partitura-seccao-cabecalho"><div><p className="partitura-indice">03</p><h2 id="alunos-titulo">Alunos confirmados <span className="horarios-contagem">{confirmados.length}</span></h2></div></div>
          {confirmados.length === 0 && (
            <EmptyState titulo="Ainda não tens alunos confirmados" />
          )}
          <div className="horarios-alunos">
            {confirmados.map((c) => (
              <div key={c.id} className="horarios-aluno">
                <span><strong>{c.alunos?.nome}</strong><small>{c.instrumentos?.nome} · {c.horarios ? `${c.horarios.dia_semana}, ${formatarHora(c.horarios.hora_inicio)}–${formatarHora(c.horarios.hora_fim)}` : 'Sem horário associado'}</small></span>
                <span>
                  <BotaoAcaoDestruir
                    label="Cancelar"
                    titulo="Cancelar matrícula?"
                    mensagem={`Esta ação remove ${c.alunos?.nome ?? 'o aluno'} deste horário.`}
                    action={cancelarMatricula}
                  >
                    <input type="hidden" name="matriculaId" value={c.id} />
                  </BotaoAcaoDestruir>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
