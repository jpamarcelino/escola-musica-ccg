import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  cancelarMatricula,
  criarHorarios,
  apagarHorarios,
  bloquearHorarios,
  desbloquearHorarios,
} from '@/lib/actions/professor'
import { DIAS_SEMANA } from '@/lib/dias-semana'
import { HOUR_HEIGHT, paraMinutos, formatarHora } from '@/lib/horarios-grade'
import { BackButton } from '@/components/back-button'
import { BotaoSelecionarTodos } from '@/components/horarios-selecionar-todos'
import { BotaoBloquearSelecionados } from '@/components/horarios-bloquear-selecionados'
import { BotaoDesbloquearSelecionados } from '@/components/horarios-desbloquear-selecionados'

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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: horariosData } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, estado')
    .eq('professor_id', user.id)
    .order('dia_semana')
    .order('hora_inicio')
  const horarios = (horariosData ?? []) as unknown as HorarioProfessor[]

  const { data: confirmadosData } = await supabase
    .from('matriculas')
    .select(
      'id, horario_final_id, instrumentos(nome), alunos(nome, encarregado:profiles!alunos_encarregado_id_fkey(telefone)), horarios(dia_semana, hora_inicio, hora_fim)'
    )
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .order('criado_em')
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
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-semibold text-foreground">Gestão de Horários</h1>
        </div>

        {erroHorarios && (
          <p className="rounded border border-red-600/30 p-3 text-sm text-red-600">
            {erroHorarios}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold">Os teus horários</h2>
          <form id="apagar-horarios-form" action={apagarHorarios} />
          <form id="bloquear-horarios-form" action={bloquearHorarios} />
          <form id="desbloquear-horarios-form" action={desbloquearHorarios} />
          {horarios.length === 0 ? (
            <p className="text-sm text-foreground/60">
              Ainda não tens horários definidos.
            </p>
          ) : (
            <>
              <p className="text-xs text-foreground/50">
                Seleciona um ou vários horários para os bloquear, desbloquear
                ou apagar.
              </p>
              <div className="horarios-grade">
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
                    <div className="horarios-coluna-dia-cabecalho">
                      {dia.slice(0, 3)}
                    </div>
                    <div
                      className="horarios-coluna-dia-corpo"
                      style={{
                        height: alturaGrade,
                        backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
                      }}
                    >
                      {horariosPorDia.get(dia)?.map((h) => {
                        const inicioMin = paraMinutos(h.hora_inicio)
                        const fimMin = paraMinutos(h.hora_fim)
                        const bloqueado = h.estado === 'bloqueado'
                        const alunos = confirmadosPorHorario.get(h.id)?.join(', ')
                        const estilo = {
                          top: ((inicioMin - horaInicioGrade * 60) / 60) * HOUR_HEIGHT,
                          height: ((fimMin - inicioMin) / 60) * HOUR_HEIGHT,
                          '--card-index': indicePorHorario.get(h.id) ?? 0,
                        } as CSSProperties

                        return (
                          <label
                            key={h.id}
                            className={`horario-bloco entrada-esquerda${bloqueado ? ' bloqueado-selecionavel' : ''}`}
                            style={estilo}
                            title={alunos ? `Aluno(s): ${alunos}` : undefined}
                          >
                            <input
                              type="checkbox"
                              name="horarioIds"
                              value={h.id}
                              form="apagar-horarios-form"
                            />
                            <span>{formatarHora(h.hora_inicio)}</span>
                            <span>{formatarHora(h.hora_fim)}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <BotaoSelecionarTodos />
                <button
                  type="submit"
                  form="apagar-horarios-form"
                  className="rounded border border-red-600/40 px-3 py-1 text-sm text-red-600 hover:bg-red-600/5"
                >
                  Apagar selecionados
                </button>
                <BotaoBloquearSelecionados />
                <BotaoDesbloquearSelecionados />
              </div>
            </>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Criar horários</h2>
          <p className="text-xs text-foreground/50">
            Os horários não são específicos de uma disciplina — servem para
            qualquer uma das que ensinas. Preenche só os dias em que dás
            aulas; deixa os outros em branco. Só entre as 10h e as 22h.
          </p>
          <form
            action={criarHorarios}
            className="space-y-3 rounded border border-foreground/15 p-4"
          >
            <div className="space-y-2">
              {DIAS_SEMANA.map((dia, i) => (
                <div key={dia} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-sm">{dia}</span>
                  <input
                    name={`inicio_${i}`}
                    type="time"
                    min="10:00"
                    max="22:00"
                    className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                  />
                  <span className="text-sm text-foreground/50">até</span>
                  <input
                    name={`fim_${i}`}
                    type="time"
                    min="10:00"
                    max="22:00"
                    className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
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
                className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded bg-brand py-2 text-sm text-white hover:bg-brand-hover"
            >
              Criar horários
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Alunos confirmados</h2>
          {confirmados.length === 0 && (
            <p className="text-sm text-foreground/60">
              Ainda não tens alunos confirmados.
            </p>
          )}
          {confirmados.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-foreground/15 px-4 py-2 text-sm"
            >
              <div>
                <p>
                  <strong>{c.alunos?.nome}</strong> — {c.instrumentos?.nome}
                  {c.horarios && (
                    <>
                      : {c.horarios.dia_semana}, {c.horarios.hora_inicio.slice(0, 5)}–
                      {c.horarios.hora_fim.slice(0, 5)}
                    </>
                  )}
                </p>
                {c.alunos?.encarregado?.telefone && (
                  <p className="text-xs text-foreground/60">
                    Telemóvel:{' '}
                    <a href={`tel:${c.alunos!.encarregado!.telefone}`} className="underline">
                      {c.alunos!.encarregado!.telefone}
                    </a>
                  </p>
                )}
              </div>
              <form action={cancelarMatricula}>
                <input type="hidden" name="matriculaId" value={c.id} />
                <button
                  type="submit"
                  className="rounded border border-red-600/40 px-3 py-1 text-sm text-red-600 hover:bg-red-600/5"
                >
                  Cancelar matrícula
                </button>
              </form>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
