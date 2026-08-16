import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { marcarNotificacaoLida, marcarTodasNotificacoesLidas } from '@/lib/actions/notificacoes'
import { EmptyState } from '@/components/empty-state'

type Notificacao = {
  id: number
  mensagem: string
  lida: boolean
  criado_em: string
}

export default async function NotificacoesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase
    .from('notificacoes')
    .select('id, mensagem, lida, criado_em')
    .eq('user_id', user.id)
    .order('criado_em', { ascending: false })
  const notificacoes = (data ?? []) as Notificacao[]
  const porLer = notificacoes.filter((n) => !n.lida).length

  return (
    <main id="conteudo-principal" className="partitura-pagina avisos-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">←</Link>
          <div><p className="partitura-sobretitulo">Arquivo familiar</p><h1>Avisos</h1><p>{porLer > 0 ? `${porLer} ${porLer === 1 ? 'aviso novo' : 'avisos novos'}` : 'Estás em dia.'}</p></div>
        </header>

        {porLer > 0 && (
          <form action={marcarTodasNotificacoesLidas}>
            <button
              type="submit"
              className="avisos-marcar-todos"
            >
              Marcar todas como lidas
            </button>
          </form>
        )}

        {notificacoes.length === 0 ? (
          <EmptyState titulo="Ainda não tens notificações" />
        ) : (
          <section className="avisos-lista" aria-label="Arquivo de avisos">
            {notificacoes.map((n) => (
              <article key={n.id} data-lida={n.lida}>
                <time>{new Date(n.criado_em).toLocaleDateString('pt-PT')}</time>
                <p>{n.mensagem}</p>
                {!n.lida && (
                  <form action={marcarNotificacaoLida}>
                    <input type="hidden" name="notificacaoId" value={n.id} />
                    <button
                      type="submit"
                      className="avisos-marcar-um"
                    >
                      Marcar como lida
                    </button>
                  </form>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
