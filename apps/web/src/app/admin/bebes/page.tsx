import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VoltarAtras } from '@/components/voltar-atras'
import { Baby, CalendarClock, ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react'

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
    <main id="conteudo-principal" className="admin-bebes">
      <div className="admin-bebes-folha">
        <header className="admin-bebes-cabecalho">
          <VoltarAtras destino="/admin" className="admin-bebes-voltar" rotulo="Voltar à visão geral"><ChevronLeft size={22} /></VoltarAtras>
          <div><h1>Música para Bebés</h1><p>Turmas, equipa e novas inscrições</p></div>
          <span className="admin-bebes-marca"><Baby size={23} /></span>
        </header>

        <section className="admin-bebes-resumo">
          <span><Baby size={22} /></span>
          <div><small>Escola dos 0 aos 5 anos</small><strong>Duas turmas, um só lugar para as gerir.</strong><p>O horário pertence à escola e as famílias inscrevem-se diretamente na turma certa.</p></div>
          <b>{porResponder ?? 0}<small>por responder</small></b>
        </section>

        <nav className="admin-bebes-opcoes" aria-label="Áreas da escola de bebés">
          <Link href="/admin/bebes/horarios">
            <span className="admin-bebes-opcao-icone"><CalendarClock size={22} /></span>
            <span><small>Turmas</small><strong>Horários e professores</strong><p>Consulta a lotação, altera a hora e gere a equipa.</p></span>
            <ChevronRight size={20} />
          </Link>
          <Link href="/admin/bebes/pedidos">
            <span className="admin-bebes-opcao-icone"><ClipboardCheck size={22} /></span>
            <span><small>Inscrições</small><strong>Pedidos de inscrição</strong><p>
              {(porResponder ?? 0) > 0
                ? `${porResponder} ${porResponder === 1 ? 'pedido aguarda' : 'pedidos aguardam'} resposta.`
                : 'Sem pedidos por responder.'}
            </p></span>
            <ChevronRight size={20} />
          </Link>
        </nav>
      </div>
    </main>
  )
}
