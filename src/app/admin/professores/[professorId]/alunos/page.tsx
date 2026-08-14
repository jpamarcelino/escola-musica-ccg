import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { ListaComPesquisa } from '@/components/lista-com-pesquisa'

type Matricula = {
  aluno_id: string
  aluno: { nome: string } | null
}

export default async function AdminProfessorAlunosPage({
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
    .select('profiles(nome)')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  const professorPerfil = professorPerfilData as { profiles: { nome: string } | null } | null

  if (!professorPerfil) {
    notFound()
  }

  const professorData = { nome: professorPerfil.profiles?.nome ?? '' }

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('aluno_id, aluno:alunos(nome)')
    .eq('professor_id', professorId)
  const matriculas = (matriculasData ?? []) as unknown as Matricula[]

  const alunosPorId = new Map<string, string>()
  for (const m of matriculas) {
    if (m.aluno) alunosPorId.set(m.aluno_id, m.aluno.nome)
  }
  const alunos = [...alunosPorId.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Visão geral', href: '/admin' },
            { label: 'Professores', href: '/admin/professores' },
            { label: professorData.nome, href: `/admin/professores/${professorId}` },
            { label: 'Alunos' },
          ]}
        />
        <PageHeader voltar={`/admin/professores/${professorId}`} titulo={professorData.nome} />

        {alunos.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--color-tinta-suave)' }}>
            Ainda não tem alunos.
          </p>
        ) : (
          <ListaComPesquisa
            itens={alunos}
            hrefPrefix="/admin/alunos/"
            placeholder="Pesquisar aluno por nome…"
          />
        )}
      </div>
    </main>
  )
}
