import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { OptionCard } from '@/components/option-card'

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
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href={`/admin/professores/${professorId}`} />
          <h1 className="text-2xl font-semibold text-foreground">{professorData.nome}</h1>
        </div>

        {alunos.length === 0 ? (
          <p className="text-sm text-foreground/60">Ainda não tem alunos.</p>
        ) : (
          <div className="hub-stack compacto">
            {alunos.map((aluno, idx) => (
              <OptionCard
                key={aluno.id}
                href={`/admin/alunos/${aluno.id}`}
                nome={aluno.nome}
                wide
                compacto
                index={idx + 1}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
