import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { marcarNotificacaoLida, marcarTodasNotificacoesLidas } from '@/lib/actions/notificacoes'
import { PageHeader } from '@/components/page-header'
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
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard" titulo="Notificações" />

        {porLer > 0 && (
          <form action={marcarTodasNotificacoesLidas}>
            <button type="submit" className="text-sm underline">
              Marcar todas como lidas
            </button>
          </form>
        )}

        {notificacoes.length === 0 ? (
          <EmptyState titulo="Ainda não tens notificações" />
        ) : (
          <div className="space-y-2">
            {notificacoes.map((n) => (
              <div key={n.id} className="lista-item flex items-start justify-between gap-3">
                <div>
                  <p className={n.lida ? 'lista-item-sub' : 'lista-item-titulo'}>
                    {!n.lida && <span aria-hidden="true">● </span>}
                    {n.mensagem}
                  </p>
                  <p className="lista-item-sub">
                    {new Date(n.criado_em).toLocaleDateString('pt-PT')}
                  </p>
                </div>
                {!n.lida && (
                  <form action={marcarNotificacaoLida}>
                    <input type="hidden" name="notificacaoId" value={n.id} />
                    <button type="submit" className="text-xs whitespace-nowrap underline">
                      Marcar como lida
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
