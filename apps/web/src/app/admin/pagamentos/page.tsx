import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VoltarAtras } from '@/components/voltar-atras'
import { ChevronLeft, ChevronRight, CircleCheckBig, History, WalletCards } from 'lucide-react'

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
    <main id="conteudo-principal" className="admin-financeiro admin-financas-pagina">
      <div className="admin-financeiro-folha">
        <header className="admin-financeiro-cabecalho"><VoltarAtras destino="/admin" className="admin-financeiro-voltar" rotulo="Voltar à visão geral"><ChevronLeft size={22} /></VoltarAtras><div><h1>Mensalidades</h1><p>Confirmações e arquivo financeiro</p></div><span className="admin-financeiro-marca"><WalletCards size={22} /></span></header>

        <nav className="admin-escolha" aria-label="Áreas de mensalidades">
          <Link href="/admin/pagamentos/confirmar"><span className="admin-escolha-icone"><CircleCheckBig size={22} /></span><span><small>Ação mensal</small><strong>Por confirmar</strong><p>Rever pagamentos em falta, organizados por professor.</p></span><ChevronRight size={20} /></Link>
          <Link href="/admin/pagamentos/historico"><span className="admin-escolha-icone"><History size={22} /></span><span><small>Arquivo</small><strong>Histórico</strong><p>Consultar e corrigir mensalidades anteriores.</p></span><ChevronRight size={20} /></Link>
        </nav>
      </div>
    </main>
  )
}
