import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  DIAS_SEMANA,
  HOUR_HEIGHT,
  duracaoDaAula,
  paraMinutos,
  formatarHora,
  formatarSala,
  type DiaSemana,
} from '@ccg/core'
import { EmptyState } from '@/components/empty-state'
import { SubmitButton } from '@/components/submit-button'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { criarHorariosDeProfessor } from '@/lib/actions/admin'
import type { PerfisEscolaPrograma } from '@ccg/types'

type Confirmado = {
  id: number
  horario_final_id: number | null
  alunos: { nome: string } | null
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
}

export default async function AdminProfessorHorarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ professorId: string }>
  searchParams: Promise<{ erro?: string; criados?: string }>
}) {
  const { professorId } = await params
  const { erro, criados } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: professorPerfilData } = await supabase
    .from('perfis_escola')
    .select('programa, profiles(nome)')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  const professorPerfil = professorPerfilData as {
    programa: PerfisEscolaPrograma | null
    profiles: { nome: string } | null
  } | null

  if (!professorPerfil) {
    notFound()
  }

  const professorData = { nome: professorPerfil.profiles?.nome ?? '', programa: professorPerfil.programa }

  const mostrarNomes = professorData.programa === 'musica'

  const { data: confirmadosData } = await supabase
    .from('matriculas')
    .select(
      'id, horario_final_id, alunos(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
    )
    .eq('professor_id', professorId)
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
      sala: formatarSala(c.horarios.salas),
      alunos: [],
    }
    bloco.alunos.push(c.alunos?.nome ?? '')
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
    <main id="conteudo-principal" className="partitura-pagina horarios-pagina admin-horario-professor">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><Link href={`/admin/professores/${professorId}`} className="partitura-voltar" aria-label="Voltar à ficha do professor">←</Link><div><p className="partitura-sobretitulo">Horário semanal</p><h1>{professorData.nome}</h1><p>{blocos.length} {blocos.length === 1 ? 'aula confirmada' : 'aulas confirmadas'}</p></div></header>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}
        {criados && (
          <MensagemInfo>
            {criados === '1' ? '1 horário criado.' : `${criados} horários criados.`}
          </MensagemInfo>
        )}

        {/* Abrir horas em nome do professor. Existe por causa dos Bebés,
            onde a grelha é da escola e não de cada professor — mas serve
            para qualquer um: a secretaria pode ter de abrir uma hora a
            quem não está à frente do computador. */}
        <details className="horarios-criar">
          <summary>
            <span><b>+</b><strong>Abrir horários</strong></span>
            <small>
              Blocos de {duracaoDaAula(professorData.programa) ?? '—'} minutos, a duração desta
              escola
            </small>
          </summary>
          <section className="horarios-criar-corpo">
            <p className="text-xs text-foreground/50">
              Preenche só os dias com horas; os outros ficam em branco. Só entre as 10h e as 22h.
            </p>
            <form action={criarHorariosDeProfessor} className="space-y-3">
              <input type="hidden" name="professorId" value={professorId} />
              <div className="space-y-2">
                {DIAS_SEMANA.map((dia, i) => (
                  <div key={dia} className="grid grid-cols-[64px_1fr_24px_1fr] items-center gap-2">
                    <span className="text-sm">{dia.slice(0, 3)}</span>
                    <input
                      type="time"
                      name={`inicio_${i}`}
                      min="10:00"
                      max="22:00"
                      aria-label={`${dia}, início`}
                      className="min-h-[48px] w-full rounded-[12px] border border-foreground/20 bg-background px-2 text-sm"
                    />
                    <span className="text-center text-sm text-foreground/40">–</span>
                    <input
                      type="time"
                      name={`fim_${i}`}
                      min="10:00"
                      max="22:00"
                      aria-label={`${dia}, fim`}
                      className="min-h-[48px] w-full rounded-[12px] border border-foreground/20 bg-background px-2 text-sm"
                    />
                  </div>
                ))}
              </div>
              <SubmitButton textoAGuardar="A criar…" className="horarios-criar-botao">
                Criar horários
              </SubmitButton>
            </form>
          </section>
        </details>

        {blocos.length === 0 ? (
          <EmptyState titulo="Ainda não tem aulas confirmadas" />
        ) : (
          <div className="horarios-grade partitura-grade">
            <div className="horarios-coluna-horas">
              <div className="horarios-coluna-horas-cabecalho" />
              {horasGrade.map((hora) => (
                <div key={hora} className="horarios-hora-label" style={{ height: HOUR_HEIGHT }}>
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
                      <div
                        key={b.horarioId}
                        className="horario-bloco entrada-esquerda"
                        style={estilo}
                        title={[b.sala, mostrarNomes ? null : b.alunos.join(', ')]
                          .filter(Boolean)
                          .join(' — ') || undefined}
                      >
                        <span>{formatarHora(b.hora_inicio)}</span>
                        <span>{formatarHora(b.hora_fim)}</span>
                        {b.sala && <span className="horario-bloco-sala">{b.sala}</span>}
                        {mostrarNomes && (
                          <span className="horario-bloco-alunos">{b.alunos.join(', ')}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
