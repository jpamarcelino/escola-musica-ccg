import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarAdministradores } from '@/lib/actions/admin'
import { BackButton } from '@/components/back-button'

type Professor = {
  id: string
  nome: string
  admin: boolean
}

export default async function AdminAdministradoresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('super_admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.super_admin) {
    redirect('/admin')
  }

  const { data: professoresData } = await supabase
    .from('profiles')
    .select('id, nome, admin')
    .eq('tipo', 'professor')
    .order('nome')
  const professores = (professoresData ?? []) as Professor[]

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div
          className="entrada-esquerda flex items-center gap-3"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <BackButton href="/admin" />
          <h1 className="text-2xl font-semibold text-foreground">Administradores</h1>
        </div>

        <p className="text-xs text-foreground/50">
          Quem estiver marcado ganha acesso à Visão geral. Não te consegues
          desmarcar a ti próprio, para nunca ficares sem acesso.
        </p>

        <form action={atualizarAdministradores} className="space-y-3">
          <div className="space-y-2">
            {professores.map((professor) => {
              const souEu = professor.id === user.id
              return (
                <label key={professor.id} className="lista-item flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="admins"
                    value={professor.id}
                    defaultChecked={professor.admin}
                    disabled={souEu}
                  />
                  {souEu && <input type="hidden" name="admins" value={professor.id} />}
                  <span className="text-sm text-foreground">
                    {professor.nome} {souEu && '(tu)'}
                  </span>
                </label>
              )
            })}
          </div>
          <button type="submit" className="botao-cartao">
            Guardar administradores
          </button>
        </form>
      </div>
    </main>
  )
}
