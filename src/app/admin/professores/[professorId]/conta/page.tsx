import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'

type ProfessorPerfil = {
  nome: string
  email: string | null
  telefone: string | null
  programa: string | null
  admin: boolean
}

type InstrumentoProfessor = {
  instrumentos: { nome: string } | null
  especialidade: string | null
}

export default async function AdminProfessorContaPage({
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
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: professorPerfilData } = await supabase
    .from('perfis_escola')
    .select('programa, admin, profiles(nome, email, telefone)')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  const professorPerfil = professorPerfilData as {
    programa: string | null
    admin: boolean
    profiles: { nome: string; email: string | null; telefone: string | null } | null
  } | null

  if (!professorPerfil) {
    notFound()
  }

  const professor: ProfessorPerfil = {
    nome: professorPerfil.profiles?.nome ?? '',
    email: professorPerfil.profiles?.email ?? null,
    telefone: professorPerfil.profiles?.telefone ?? null,
    programa: professorPerfil.programa,
    admin: professorPerfil.admin,
  }

  const { data: instrumentosData } = await supabase
    .from('professor_instrumentos')
    .select('instrumentos(nome), especialidade')
    .eq('professor_id', professorId)
  const instrumentos = (instrumentosData ?? []) as unknown as InstrumentoProfessor[]

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href={`/admin/professores/${professorId}`} />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{professor.nome}</h1>
            {professor.admin && <p className="text-xs text-foreground/50">Administrador</p>}
          </div>
        </div>

        <div className="lista-item space-y-1">
          <p className="lista-item-sub">
            Escola:{' '}
            {professor.programa === 'musica'
              ? 'Música'
              : professor.programa === 'danca'
                ? 'Dança'
                : 'sem escola'}
          </p>
          {professor.email && <p className="lista-item-sub">Email: {professor.email}</p>}
          {professor.telefone && (
            <p className="lista-item-sub">Telemóvel: {professor.telefone}</p>
          )}
          <p className="lista-item-sub">
            {instrumentos.length > 0
              ? instrumentos
                  .map((i) => i.instrumentos?.nome + (i.especialidade ? ` (${i.especialidade})` : ''))
                  .join(', ')
              : 'Sem disciplinas definidas'}
          </p>
        </div>
      </div>
    </main>
  )
}
