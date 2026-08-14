import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { Breadcrumbs } from '@/components/breadcrumbs'

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
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Visão geral', href: '/admin' },
            { label: 'Professores', href: '/admin/professores' },
            { label: professor.nome, href: `/admin/professores/${professorId}` },
            { label: 'Conta' },
          ]}
        />
        <PageHeader
          voltar={`/admin/professores/${professorId}`}
          titulo={professor.nome}
          subtitulo={professor.admin ? 'Administrador' : undefined}
        />

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
