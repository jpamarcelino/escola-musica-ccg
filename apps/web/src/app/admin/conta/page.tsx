import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  atualizarNomeConta,
  atualizarPasswordConta,
  apagarConta,
  apagarContaSuperAdmin,
  logout,
} from '@/lib/actions/auth'
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
    .select('nome, perfis_escola(tipo, admin, super_admin)')
    .eq('id', user.id)
    .single()

  const profileRow = profileRowData as {
    nome: string
    perfis_escola: { tipo: string; admin: boolean; super_admin: boolean } | null
  } | null

  const profile = profileRow
    ? {
        nome: profileRow.nome,
        tipo: profileRow.perfis_escola?.tipo,
        admin: profileRow.perfis_escola?.admin ?? false,
        super_admin: profileRow.perfis_escola?.super_admin ?? false,
      }
    : null

  // A porta é a marca de administração, não o tipo de perfil. Só deixar
  // entrar `tipo === 'admin'` fechava esta página a um professor que
  // também administra — e como o "Mais" da barra da administração aponta
  // para cá, tocar-lhe atirava-o para fora do painel onde estava.
  if (!profile?.admin) {
    redirect('/dashboard')
  }
  // Quem só administra não tem painel de aulas para onde voltar: para
  // esses, /dashboard reencaminha de volta para /admin, e oferecer a
  // saída seria mandá-los num círculo.
  const temPainelProprio = profile.tipo !== 'admin'

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
    <main id="conteudo-principal" className="partitura-pagina admin-conta-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><Link href="/admin" className="partitura-voltar" aria-label="Voltar à visão geral">←</Link><div><p className="partitura-sobretitulo">Definições pessoais</p><h1>Conta</h1><p>{user.email}</p></div></header>

        {erro && (
          <p className="admin-alerta" role="alert">{erro}</p>
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

        {temPainelProprio && (
          <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
            <h2 className="font-semibold">As tuas aulas</h2>
            <p className="text-sm text-foreground/60">
              A tua foto, as disciplinas que ensinas e a tua agenda estão no painel
              de professor.
            </p>
            <LigacaoTerciaria href="/dashboard">Voltar ao painel de professor</LigacaoTerciaria>
          </section>
        )}

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
              mensagem="Perdes o acesso e os dados da conta são apagados. Não há como voltar atrás."
              action={apagarConta}
            />
          )}
        </section>
      </div>
    </main>
  )
}
import Link from 'next/link'
