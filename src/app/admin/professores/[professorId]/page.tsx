import type { CSSProperties } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { formatarSala } from '@/lib/sala'
import { formatarHora } from '@/lib/horarios-grade'

type ProfessorPerfil = {
  nome: string
  email: string | null
  telefone: string | null
  programa: string | null
  admin: boolean
}

type Horario = {
  id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  estado: string
  salas: { nome: string; piso: number | null; numero: number | null } | null
}

type InstrumentoProfessor = {
  instrumentos: { nome: string } | null
  especialidade: string | null
}

export default async function AdminProfessorPage({
  params,
}: {
  params: Promise<{ professorId: string }>
}) {
  const { professorId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: professorData } = await supabase
    .from('profiles')
    .select('nome, email, telefone, programa, admin')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()
  const professor = professorData as ProfessorPerfil | null

  if (!professor) {
    notFound()
  }

  const { data: instrumentosData } = await supabase
    .from('professor_instrumentos')
    .select('instrumentos(nome), especialidade')
    .eq('professor_id', professorId)
  const instrumentos = (instrumentosData ?? []) as unknown as InstrumentoProfessor[]

  const { data: horariosData } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, estado, salas(nome, piso, numero)')
    .eq('professor_id', professorId)
    .order('dia_semana')
    .order('hora_inicio')
  const horarios = (horariosData ?? []) as unknown as Horario[]

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-8 text-left">
        <div
          className="entrada-esquerda flex items-center gap-3"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <BackButton href="/admin/professores" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{professor.nome}</h1>
            {professor.admin && <p className="text-xs text-foreground/50">Administrador</p>}
          </div>
        </div>

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 1 } as CSSProperties}
        >
          <h2 className="secao-titulo">Conta</h2>
          <div className="lista-item space-y-1">
            <p className="lista-item-sub">
              Escola: {professor.programa === 'musica' ? 'Música' : professor.programa === 'danca' ? 'Dança' : 'sem escola'}
            </p>
            {professor.email && <p className="lista-item-sub">Email: {professor.email}</p>}
            {professor.telefone && <p className="lista-item-sub">Telemóvel: {professor.telefone}</p>}
            <p className="lista-item-sub">
              {instrumentos.length > 0
                ? instrumentos
                    .map((i) => i.instrumentos?.nome + (i.especialidade ? ` (${i.especialidade})` : ''))
                    .join(', ')
                : 'Sem disciplinas definidas'}
            </p>
          </div>
        </section>

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 2 } as CSSProperties}
        >
          <h2 className="secao-titulo">Horários</h2>
          {horarios.length === 0 ? (
            <p className="text-sm text-foreground/60">Ainda não tem horários definidos.</p>
          ) : (
            <div className="space-y-2">
              {horarios.map((h) => (
                <div key={h.id} className="lista-item flex items-center justify-between gap-3">
                  <div>
                    <p className="lista-item-titulo">
                      {h.dia_semana}, {formatarHora(h.hora_inicio)}–{formatarHora(h.hora_fim)}
                    </p>
                    {formatarSala(h.salas) && (
                      <p className="lista-item-sub">{formatarSala(h.salas)}</p>
                    )}
                  </div>
                  {h.estado === 'bloqueado' && (
                    <span className="estado-pill estado-falta_sem_aviso">Bloqueado</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
