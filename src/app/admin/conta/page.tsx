import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  atualizarNomeConta,
  atualizarPasswordConta,
} from '@/lib/actions/auth'
import { BackButton } from '@/components/back-button'
import { EditarNomeForm, AlterarPasswordForm } from '@/components/conta-forms'

export default async function AdminContaPage() {
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

  if (profile?.tipo !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin" />
          <h1 className="text-2xl font-semibold text-foreground">Conta</h1>
        </div>

        <section className="space-y-4">
          <h2 className="font-semibold">Dados</h2>
          <EditarNomeForm action={atualizarNomeConta} nomeAtual={profile.nome} />
          <p className="text-sm">
            <span className="text-foreground/60">Email: </span>
            {user.email}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Alterar password</h2>
          <AlterarPasswordForm action={atualizarPasswordConta} />
        </section>
      </div>
    </main>
  )
}
