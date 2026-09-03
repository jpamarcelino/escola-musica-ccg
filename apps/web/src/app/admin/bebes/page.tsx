import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VoltarAtras } from '@/components/voltar-atras'

// A escola de Bebés, vista da secretaria.
//
// Fica no design antigo de propósito: o resto de /admin ainda não foi
// redesenhado, e uma página nova em Pinterest no meio das outras vinte
// dava a entender que a secretaria já tinha mudado.
export default async function AdminBebesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.admin) redirect('/dashboard')

  // A contagem por responder é o que decide se vale a pena entrar hoje.
  const { data: turmas } = await supabase.from('turmas_bebes').select('instrumento_id')
  const ids = (turmas ?? []).map((t) => t.instrumento_id)

  const { count: porResponder } = ids.length
    ? await supabase
        .from('matriculas')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'a_escolher')
        .in('instrumento_id', ids)
    : { count: 0 }

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-financas-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <VoltarAtras destino="/admin" className="partitura-voltar" rotulo="Voltar à visão geral">←</VoltarAtras>
          <div>
            <p className="partitura-sobretitulo">Escola</p>
            <h1>Música para Bebés</h1>
            <p>As duas turmas são da escola: o horário e as inscrições decidem-se aqui.</p>
          </div>
        </header>

        <nav className="admin-escolha" aria-label="Áreas da escola de bebés">
          <Link href="/admin/bebes/horarios">
            <span className="partitura-indice">01 · Turmas</span>
            <strong>Horários e professores</strong>
            <p>Mudar o dia e a hora de cada turma, e escolher quem as dá.</p>
            <i aria-hidden="true">→</i>
          </Link>
          <Link href="/admin/bebes/pedidos">
            <span className="partitura-indice">02 · Inscrições</span>
            <strong>Pedidos de inscrição</strong>
            <p>
              {(porResponder ?? 0) > 0
                ? `${porResponder} ${porResponder === 1 ? 'pedido aguarda' : 'pedidos aguardam'} resposta.`
                : 'Sem pedidos por responder.'}
            </p>
            <i aria-hidden="true">→</i>
          </Link>
        </nav>
      </div>
    </main>
  )
}
