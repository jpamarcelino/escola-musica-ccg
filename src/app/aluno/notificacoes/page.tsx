import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { marcarNotificacaoLida, marcarTodasNotificacoesLidas } from '@/lib/actions/notificacoes'
import { BackButton } from '@/components/back-button'

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
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-semibold text-foreground">Notificações</h1>
        </div>

        {porLer > 0 && (
          <form action={marcarTodasNotificacoesLidas}>
            <button type="submit" className="text-sm underline">
              Marcar todas como lidas
            </button>
          </form>
        )}

        {notificacoes.length === 0 ? (
          <p className="text-sm text-foreground/60">Ainda não tens notificações.</p>
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
