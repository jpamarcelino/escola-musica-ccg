import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  atualizarNomeConta,
  atualizarPasswordConta,
  apagarConta,
  apagarContaSuperAdmin,
} from '@/lib/actions/auth'
import { BackButton } from '@/components/back-button'
import { EditarNomeForm, AlterarPasswordForm } from '@/components/conta-forms'
import { BotaoApagarConta } from '@/components/apagar-conta-botao'
import { ApagarContaSuperAdminForm } from '@/components/apagar-conta-super-admin-form'

export default async function AdminContaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, tipo, super_admin')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'admin') {
    redirect('/dashboard')
  }

  const { data: outrosAdminsData } = profile.super_admin
    ? await supabase.from('profiles').select('id, nome').eq('admin', true).neq('id', user.id)
    : { data: [] }
  const outrosAdmins = outrosAdminsData ?? []

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin" />
          <h1 className="text-2xl font-semibold text-foreground">Conta</h1>
        </div>

        {erro && (
          <p className="rounded border border-red-600/30 p-3 text-sm text-red-600">{erro}</p>
        )}

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

        <section className="space-y-3 border-t border-foreground/10 pt-6">
          {profile.super_admin ? (
            <ApagarContaSuperAdminForm action={apagarContaSuperAdmin} outrosAdmins={outrosAdmins} />
          ) : (
            <BotaoApagarConta action={apagarConta} />
          )}
        </section>
      </div>
    </main>
  )
}
