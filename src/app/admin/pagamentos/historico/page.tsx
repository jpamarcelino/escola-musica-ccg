import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { OptionCard } from '@/components/option-card'

type Professor = {
  id: string
  nome: string
}

export default async function HistoricoPagamentosPage() {
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

  const { data: professoresData } = await supabase
    .from('perfis_escola')
    .select('id, profiles(nome)')
    .eq('tipo', 'professor')
    .order('nome', { referencedTable: 'profiles' })
  const professores = (
    (professoresData ?? []) as unknown as { id: string; profiles: { nome: string } | null }[]
  ).map((p) => ({
    id: p.id,
    nome: p.profiles?.nome ?? '',
  })) as Professor[]

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin/pagamentos" />
          <h1 className="text-2xl font-semibold text-foreground">
            Histórico de Mensalidades
          </h1>
        </div>

        {professores.length === 0 ? (
          <p className="text-sm text-foreground/60">Ainda não há professores registados.</p>
        ) : (
          <div className="hub-stack">
            {professores.map((professor, idx) => (
              <OptionCard
                key={professor.id}
                href={`/admin/pagamentos/historico/${professor.id}`}
                nome={professor.nome}
                wide
                index={idx + 1}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
