import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarAdministradores } from '@/lib/actions/admin'
import { BackButton } from '@/components/back-button'

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

type PresencaResumo = {
  estado: string
  matriculas: { aluno_id: string; aluno: { nome: string } | null } | null
}

type ResumoFaltas = {
  nome: string
  presente: number
  falta_aviso: number
  falta_sem_aviso: number
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

  const { data: presencasData } = await supabase
    .from('presencas')
    .select(
      'estado, matriculas(aluno_id, aluno:profiles!matriculas_aluno_id_fkey(nome))'
    )
  const presencas = (presencasData ?? []) as unknown as PresencaResumo[]

  const faltasPorAluno = new Map<string, ResumoFaltas>()
  for (const p of presencas) {
    if (!p.matriculas?.aluno) continue
    const atual = faltasPorAluno.get(p.matriculas.aluno_id) ?? {
      nome: p.matriculas.aluno.nome,
      presente: 0,
      falta_aviso: 0,
      falta_sem_aviso: 0,
    }
    if (p.estado === 'presente') atual.presente += 1
    else if (p.estado === 'falta_aviso') atual.falta_aviso += 1
    else if (p.estado === 'falta_sem_aviso') atual.falta_sem_aviso += 1
    faltasPorAluno.set(p.matriculas.aluno_id, atual)
  }
  const resumoFaltas = [...faltasPorAluno.values()].sort(
    (a, b) =>
      b.falta_aviso + b.falta_sem_aviso - (a.falta_aviso + a.falta_sem_aviso) ||
      a.nome.localeCompare(b.nome)
  )

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-3xl space-y-8 text-left">
        <div
          className="entrada-esquerda flex items-center gap-3"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <BackButton href="/dashboard" />
          <div>
            <h1 className="text-2xl">
              <span className="saudacao">Visão</span>{' '}
              <span className="font-semibold text-foreground">geral</span>
            </h1>
            <p className="text-sm text-foreground/60">
              Só tu (e outros administradores) vês esta página.
            </p>
            <Link href="/admin/pagamentos" className="text-sm underline">
              Mensalidades
            </Link>
          </div>
        </div>

        <section
          className="entrada-esquerda grid grid-cols-2 gap-3 sm:grid-cols-4"
          style={{ '--card-index': 1 } as CSSProperties}
        >
          <div className="stat-tile">
            <p className="stat-tile-numero">{alunos.length}</p>
            <p className="stat-tile-legenda">Alunos</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{professores.length}</p>
            <p className="stat-tile-legenda">Professores</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totalConfirmadas}</p>
            <p className="stat-tile-legenda">Aulas confirmadas</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totalPendentes}</p>
            <p className="stat-tile-legenda">Pedidos por confirmar</p>
          </div>
        </section>

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 2 } as CSSProperties}
        >
          <h2 className="secao-titulo">Alunos</h2>
          {alunos.length === 0 && (
            <p className="text-sm text-foreground/60">Ainda não há alunos registados.</p>
          )}
          <div className="space-y-2">
            {alunos.map((aluno) => {
              const matriculasDoAluno = matriculas.filter(
                (m) => m.aluno_id === aluno.id
              )
              return (
                <div key={aluno.id} className="lista-item">
                  <p className="lista-item-titulo">{aluno.nome}</p>
                  {matriculasDoAluno.length === 0 && (
                    <p className="lista-item-sub">Ainda não pediu aula.</p>
                  )}
                  {matriculasDoAluno.map((m) => (
                    <p key={m.id} className="lista-item-sub">
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

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 3 } as CSSProperties}
        >
          <h2 className="secao-titulo">Professores</h2>
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
                <div key={professor.id} className="lista-item">
                  <p className="lista-item-titulo">
                    {professor.nome}{' '}
                    <span className="font-sans text-xs font-normal text-foreground/50">
                      (
                      {professor.programa === 'musica'
                        ? 'Música'
                        : professor.programa === 'danca'
                          ? 'Dança'
                          : 'sem escola'}
                      )
                    </span>{' '}
                    {professor.admin && (
                      <span className="font-sans text-xs font-normal text-foreground/50">
                        (admin)
                      </span>
                    )}
                  </p>
                  <p className="lista-item-sub">
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

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 4 } as CSSProperties}
        >
          <h2 className="secao-titulo">Presenças</h2>
          {resumoFaltas.length === 0 && (
            <p className="text-sm text-foreground/60">
              Ainda não há presenças marcadas por nenhum professor.
            </p>
          )}
          <div className="space-y-2">
            {resumoFaltas.map((r) => (
              <div key={r.nome} className="lista-item">
                <p className="lista-item-titulo">{r.nome}</p>
                <p className="lista-item-sub">
                  {r.presente} presença{r.presente === 1 ? '' : 's'} —{' '}
                  {r.falta_aviso} falta{r.falta_aviso === 1 ? '' : 's'} com aviso —{' '}
                  {r.falta_sem_aviso} falta{r.falta_sem_aviso === 1 ? '' : 's'} sem aviso
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 5 } as CSSProperties}
        >
          <h2 className="secao-titulo">Administradores</h2>
          <p className="text-xs text-foreground/50">
            Quem estiver marcado ganha acesso a esta página. Não te consegues
            desmarcar a ti próprio, para nunca ficares sem acesso.
          </p>
          <form action={atualizarAdministradores} className="space-y-3">
            <div className="space-y-2">
              {professores.map((professor) => {
                const souEu = professor.id === user.id
                return (
                  <label key={professor.id} className="lista-item flex items-center gap-2">
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
                    <span className="text-sm text-foreground">
                      {professor.nome} {souEu && '(tu)'}
                    </span>
                  </label>
                )
              })}
            </div>
            <button type="submit" className="botao-cartao">
              Guardar administradores
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
