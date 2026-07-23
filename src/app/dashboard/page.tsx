import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, tipo')
    .eq('id', user.id)
    .single()

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Bem-vindo, {profile?.nome}</h1>
        <p className="text-sm text-foreground/60">
          Estás autenticado como <strong>{profile?.tipo}</strong>.
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="rounded border border-foreground/20 px-4 py-2"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  )
}
