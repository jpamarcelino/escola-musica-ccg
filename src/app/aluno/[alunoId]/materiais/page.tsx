import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { MateriaisClient } from './materiais-client'

export default async function MateriaisPage({
  params,
}: {
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: aluno } = await supabase
    .from('alunos')
    .select('nome')
    .eq('id', alunoId)
    .eq('encarregado_id', user.id)
    .maybeSingle()

  if (!aluno) {
    notFound()
  }

  // O metrónomo só faz sentido para alunos de música — dança e "Música para
  // bebés" não usam este material. Basta uma matrícula (em qualquer estado)
  // numa disciplina de programa 'musica'.
  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('instrumentos(programa)')
    .eq('aluno_id', alunoId)

  const temMusica = ((matriculas ?? []) as unknown as { instrumentos: { programa: string } | null }[]).some(
    (m) => m.instrumentos?.programa === 'musica'
  )

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar={`/aluno/${alunoId}`} titulo="Materiais das Aulas" />
        <MateriaisClient temMusica={temMusica} />
      </div>
    </main>
  )
}
