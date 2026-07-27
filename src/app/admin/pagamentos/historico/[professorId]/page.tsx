import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'

export default async function HistoricoPagamentosProfessorPage({
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
    .select('nome')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  if (!professorData) {
    notFound()
  }

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin/pagamentos/historico" />
          <h1 className="text-2xl font-semibold text-foreground">{professorData.nome}</h1>
        </div>
        <p className="text-sm text-foreground/60">Em breve.</p>
      </div>
    </main>
  )
}
