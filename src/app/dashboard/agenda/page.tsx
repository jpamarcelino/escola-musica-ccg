import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DIAS_SEMANA } from '@/lib/dias-semana'
import { HOUR_HEIGHT, paraMinutos, formatarHora } from '@/lib/horarios-grade'
import { BackButton } from '@/components/back-button'

type Confirmado = {
  id: number
  horario_final_id: number | null
  profiles: { nome: string } | null
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
}

type BlocoAgenda = {
  horarioId: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  alunos: string[]
}

export default async function AgendaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tipo, programa')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const mostrarNomes = profile.programa === 'musica'

  const { data: confirmadosData } = await supabase
    .from('matriculas')
    .select(
      'id, horario_final_id, profiles!matriculas_aluno_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim)'
    )
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .not('horario_final_id', 'is', null)
    .order('criado_em')
  const confirmados = (confirmadosData ?? []) as unknown as Confirmado[]

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
      alunos: [],
    }
    bloco.alunos.push(c.profiles?.nome ?? '')
    blocosPorHorario.set(c.horario_final_id, bloco)
  }
  const blocos = [...blocosPorHorario.values()]

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

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-semibold text-foreground">Horários e Alunos</h1>
        </div>

        {blocos.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Ainda não tens aulas confirmadas.
          </p>
        ) : (
          <>
            <p className="text-xs text-foreground/50">
              Clica num horário para veres os alunos dessa aula.
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
                  <div className="horarios-coluna-dia-cabecalho">{dia.slice(0, 3)}</div>
                  <div
                    className="horarios-coluna-dia-corpo"
                    style={{
                      height: alturaGrade,
                      backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
                    }}
                  >
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
                          title={mostrarNomes ? undefined : b.alunos.join(', ')}
                        >
                          <span>{formatarHora(b.hora_inicio)}</span>
                          <span>{formatarHora(b.hora_fim)}</span>
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
          </>
        )}
      </div>
    </main>
  )
}
