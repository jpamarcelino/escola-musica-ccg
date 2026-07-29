import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { OptionCard } from '@/components/option-card'

export default async function PagamentosPage() {
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

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin" />
          <h1 className="text-2xl font-semibold text-foreground">Mensalidades</h1>
        </div>

        <div className="hub-stack">
          <OptionCard
            href="/admin/pagamentos/confirmar"
            nome="Mensalidades por Confirmar"
            wide
            index={1}
          />
          <OptionCard
            href="/admin/pagamentos/historico"
            nome="Histórico de Mensalidades"
            wide
            index={2}
          />
        </div>
      </div>
    </main>
  )
}
