import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VoltarAtras } from '@/components/voltar-atras'

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
    <main id="conteudo-principal" className="partitura-pagina admin-financas-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><VoltarAtras destino="/admin" className="partitura-voltar" rotulo="Voltar à visão geral">←</VoltarAtras><div><p className="partitura-sobretitulo">Controlo financeiro</p><h1>Mensalidades</h1><p>Confirmações mensais e arquivo de pagamentos.</p></div></header>

        <nav className="admin-escolha" aria-label="Áreas de mensalidades">
          <Link href="/admin/pagamentos/confirmar"><span className="partitura-indice">01 · Ação mensal</span><strong>Por confirmar</strong><p>Rever os pagamentos em falta, organizados por professor.</p><i aria-hidden="true">→</i></Link>
          <Link href="/admin/pagamentos/historico"><span className="partitura-indice">02 · Arquivo</span><strong>Histórico</strong><p>Consultar mensalidades anteriores por professor.</p><i aria-hidden="true">→</i></Link>
        </nav>
      </div>
    </main>
  )
}
