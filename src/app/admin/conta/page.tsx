import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  atualizarNomeConta,
  atualizarPasswordConta,
  apagarConta,
  apagarContaSuperAdmin,
  logout,
} from '@/lib/actions/auth'
import { PageHeader } from '@/components/page-header'
import { EditarNomeForm, AlterarPasswordForm } from '@/components/conta-forms'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { ApagarContaSuperAdminForm } from '@/components/apagar-conta-super-admin-form'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'

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

  const { data: profileRowData } = await supabase
    .from('profiles')
    .select('nome, perfis_escola(tipo, super_admin)')
    .eq('id', user.id)
    .single()

  const profileRow = profileRowData as {
    nome: string
    perfis_escola: { tipo: string; super_admin: boolean } | null
  } | null

  const profile = profileRow
    ? {
        nome: profileRow.nome,
        tipo: profileRow.perfis_escola?.tipo,
        super_admin: profileRow.perfis_escola?.super_admin ?? false,
      }
    : null

  if (profile?.tipo !== 'admin') {
    redirect('/dashboard')
  }

  const { data: outrosAdminsData } = profile.super_admin
    ? await supabase
        .from('perfis_escola')
        .select('id, profiles(nome)')
        .eq('admin', true)
        .neq('id', user.id)
    : { data: [] }
  const outrosAdmins = (
    (outrosAdminsData ?? []) as unknown as { id: string; profiles: { nome: string } | null }[]
  ).map((p) => ({
    id: p.id,
    nome: p.profiles?.nome ?? '',
  }))

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/admin" titulo="Conta" />

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

        <section className="border-t border-[var(--color-linha)] pt-6">
          <form action={logout}>
            <LigacaoTerciaria>Sair da conta</LigacaoTerciaria>
          </form>
        </section>

        <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
          {profile.super_admin ? (
            <ApagarContaSuperAdminForm action={apagarContaSuperAdmin} outrosAdmins={outrosAdmins} />
          ) : (
            <BotaoAcaoDestruir
              label="Apagar conta"
              mensagem="Tens a certeza que queres apagar a tua conta? Esta ação é irreversível — perdes o acesso e todos os teus dados de conta são apagados. (O histórico de presenças e mensalidades mantém-se.)"
              action={apagarConta}
            />
          )}
        </section>
      </div>
    </main>
  )
}
