import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarAdministradores } from '@/lib/actions/admin'

type Perfil = {
  id: string
  nome: string
  tipo: string
  admin: boolean
  programa: string | null
}

type MatriculaResumo = {
  id: number
  aluno_id: string
  professor_id: string
  estado: string
  aluno: { nome: string } | null
  professor: { nome: string } | null
  instrumentos: { nome: string } | null
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
}

type HorarioResumo = {
  id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  estado: string
  professor_id: string
}

export default async function AdminPage() {
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

  const { data: perfisData } = await supabase
    .from('profiles')
    .select('id, nome, tipo, admin, programa')
    .order('criado_em')
  const perfis = (perfisData ?? []) as Perfil[]
  const alunos = perfis.filter((p) => p.tipo === 'aluno')
  const professores = perfis.filter((p) => p.tipo === 'professor')

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select(
      'id, aluno_id, professor_id, estado, aluno:profiles!matriculas_aluno_id_fkey(nome), professor:profiles!matriculas_professor_id_fkey(nome), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim)'
    )
    .order('criado_em', { ascending: false })
  const matriculas = (matriculasData ?? []) as unknown as MatriculaResumo[]

  const { data: horariosData } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, estado, professor_id')
  const horarios = (horariosData ?? []) as unknown as HorarioResumo[]

  const { data: profInstrData } = await supabase
    .from('professor_instrumentos')
    .select('professor_id, instrumentos(nome)')
  const instrumentosPorProfessor = new Map<string, string[]>()
  for (const r of (profInstrData ?? []) as unknown as {
    professor_id: string
    instrumentos: { nome: string } | null
  }[]) {
    if (!r.instrumentos) continue
    const lista = instrumentosPorProfessor.get(r.professor_id) ?? []
    lista.push(r.instrumentos.nome)
    instrumentosPorProfessor.set(r.professor_id, lista)
  }

  const totalConfirmadas = matriculas.filter((m) => m.estado === 'confirmado').length
  const totalPendentes = matriculas.filter((m) => m.estado === 'a_escolher').length

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-3xl space-y-8 text-left">
        <div>
          <h1 className="text-xl font-semibold">Visão geral</h1>
          <p className="text-sm text-foreground/60">
            Só tu (e outros administradores) vês esta página.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded border border-foreground/15 p-4 text-center">
            <p className="text-2xl font-semibold">{alunos.length}</p>
            <p className="text-xs text-foreground/60">Alunos</p>
          </div>
          <div className="rounded border border-foreground/15 p-4 text-center">
            <p className="text-2xl font-semibold">{professores.length}</p>
            <p className="text-xs text-foreground/60">Professores</p>
          </div>
          <div className="rounded border border-foreground/15 p-4 text-center">
            <p className="text-2xl font-semibold">{totalConfirmadas}</p>
            <p className="text-xs text-foreground/60">Aulas confirmadas</p>
          </div>
          <div className="rounded border border-foreground/15 p-4 text-center">
            <p className="text-2xl font-semibold">{totalPendentes}</p>
            <p className="text-xs text-foreground/60">Pedidos por confirmar</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Alunos</h2>
          {alunos.length === 0 && (
            <p className="text-sm text-foreground/60">Ainda não há alunos registados.</p>
          )}
          <div className="space-y-2">
            {alunos.map((aluno) => {
              const matriculasDoAluno = matriculas.filter(
                (m) => m.aluno_id === aluno.id
              )
              return (
                <div
                  key={aluno.id}
                  className="rounded border border-foreground/15 px-4 py-2 text-sm"
                >
                  <p className="font-medium">{aluno.nome}</p>
                  {matriculasDoAluno.length === 0 && (
                    <p className="text-xs text-foreground/60">Ainda não pediu aula.</p>
                  )}
                  {matriculasDoAluno.map((m) => (
                    <p key={m.id} className="text-xs text-foreground/60">
                      {m.estado === 'a_escolher' && (
                        <>
                          A aguardar confirmação de {m.professor?.nome} (
                          {m.instrumentos?.nome})
                        </>
                      )}
                      {m.estado === 'confirmado' && m.horarios && (
                        <>
                          Confirmado com {m.professor?.nome} (
                          {m.instrumentos?.nome}): {m.horarios.dia_semana},{' '}
                          {m.horarios.hora_inicio.slice(0, 5)}–
                          {m.horarios.hora_fim.slice(0, 5)}
                        </>
                      )}
                    </p>
                  ))}
                </div>
              )
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Professores</h2>
          {professores.length === 0 && (
            <p className="text-sm text-foreground/60">
              Ainda não há professores registados.
            </p>
          )}
          <div className="space-y-2">
            {professores.map((professor) => {
              const horariosDoProfessor = horarios.filter(
                (h) => h.professor_id === professor.id
              )
              const abertos = horariosDoProfessor.filter((h) => h.estado === 'aberto').length
              const bloqueados = horariosDoProfessor.filter(
                (h) => h.estado === 'bloqueado'
              ).length
              const confirmadosDoProfessor = matriculas.filter(
                (m) => m.professor_id === professor.id && m.estado === 'confirmado'
              ).length
              const instrumentosDoProfessor =
                instrumentosPorProfessor.get(professor.id) ?? []

              return (
                <div
                  key={professor.id}
                  className="rounded border border-foreground/15 px-4 py-2 text-sm"
                >
                  <p className="font-medium">
                    {professor.nome}{' '}
                    <span className="text-xs text-foreground/50">
                      (
                      {professor.programa === 'musica'
                        ? 'Música'
                        : professor.programa === 'danca'
                          ? 'Dança'
                          : 'sem escola'}
                      )
                    </span>{' '}
                    {professor.admin && (
                      <span className="text-xs text-foreground/50">(admin)</span>
                    )}
                  </p>
                  <p className="text-xs text-foreground/60">
                    {instrumentosDoProfessor.length > 0
                      ? instrumentosDoProfessor.join(', ')
                      : 'Sem instrumentos definidos'}{' '}
                    — {abertos} horário(s) aberto(s), {bloqueados} bloqueado(s) —{' '}
                    {confirmadosDoProfessor} aluno(s) confirmado(s)
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Administradores</h2>
          <p className="text-xs text-foreground/50">
            Quem estiver marcado ganha acesso a esta página. Não te consegues
            desmarcar a ti próprio, para nunca ficares sem acesso.
          </p>
          <form action={atualizarAdministradores} className="space-y-3">
            <div className="space-y-2">
              {professores.map((professor) => {
                const souEu = professor.id === user.id
                return (
                  <label
                    key={professor.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="admins"
                      value={professor.id}
                      defaultChecked={professor.admin}
                      disabled={souEu}
                    />
                    {souEu && (
                      <input type="hidden" name="admins" value={professor.id} />
                    )}
                    {professor.nome} {souEu && '(tu)'}
                  </label>
                )
              })}
            </div>
            <button
              type="submit"
              className="rounded border border-foreground/20 px-3 py-1 text-sm"
            >
              Guardar administradores
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
