import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { LinhaLista, GrupoLista } from '@/components/lista'

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
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/admin" titulo="Mensalidades" />

        <GrupoLista>
          <LinhaLista href="/admin/pagamentos/confirmar" titulo="Mensalidades por Confirmar" />
          <LinhaLista href="/admin/pagamentos/historico" titulo="Histórico de Mensalidades" />
        </GrupoLista>
      </div>
    </main>
  )
}
