import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OptionCard } from '@/components/option-card'
import { BackButton } from '@/components/back-button'

export default async function AlunoHubPage({
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

  const { count: notificacoesPorLer } = await supabase
    .from('notificacoes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('lida', false)

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-semibold text-foreground">{aluno.nome}</h1>
        </div>

        <div className="hub-stack">
          <OptionCard href={`/aluno/${alunoId}/pedido`} nome="Pedir Aula" wide index={1} />
          <OptionCard href={`/aluno/${alunoId}/horario`} nome="Horário e Aulas" wide index={2} />
          <OptionCard href="/aluno/calendario" nome="Calendário Escolar" wide index={3} />
          <OptionCard href={`/aluno/${alunoId}/materiais`} nome="Materiais das Aulas" wide index={4} />
          <OptionCard
            href="/aluno/notificacoes"
            nome="Notificações"
            wide
            index={5}
            badge={notificacoesPorLer ?? 0}
          />
        </div>
      </div>
    </main>
  )
}
