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
import { AtivarNotificacoes } from '@/components/ativar-notificacoes'
import { SeletorAparencia } from '@/components/seletor-aparencia'
import {
  Bell,
  ChevronLeft,
  GraduationCap,
  KeyRound,
  LogOut,
  MonitorCog,
  ShieldAlert,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'

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

  // Os aparelhos desta conta que já têm notificações ligadas. Vai só
  // como lista de endpoints: é o que o componente precisa para saber se
  // ESTE aparelho já está ligado, e não há motivo para mandar as chaves
  // de cada um para o browser.
  const { data: subscricoesData } = await supabase
    .from('push_subscricoes')
    .select('endpoint')
    .eq('user_id', user.id)
  const endpoints = (subscricoesData ?? []).map((s) => s.endpoint)
  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

  return (
    <main id="conteudo-principal" className="admin-conta-pagina">
      <div className="admin-conta-folha">
        <header className="admin-conta-cabecalho">
          <VoltarAtras destino="/admin" className="admin-conta-voltar" rotulo="Voltar à visão geral">
            <ChevronLeft size={22} aria-hidden="true" />
          </VoltarAtras>
          <div>
            <h1>Conta</h1>
            <p>Dados, segurança e preferências</p>
          </div>
          <span className="admin-conta-avatar" aria-hidden="true">
            {(profile.nome[0] ?? 'S').toUpperCase()}
          </span>
        </header>

        {erro && (
          <p className="admin-alerta" role="alert">{erro}</p>
        )}

        <section className="admin-conta-seccao">
          <header>
            <span><UserRound size={20} aria-hidden="true" /></span>
            <div><h2>Dados pessoais</h2><p>A tua identificação na plataforma</p></div>
          </header>
          <div className="admin-conta-corpo">
            <EditarNomeForm action={atualizarNomeConta} nomeAtual={profile.nome} />
            <div className="admin-conta-email"><span>Email</span><strong>{user.email}</strong></div>
          </div>
        </section>

        <section className="admin-conta-seccao">
          <header>
            <span><KeyRound size={20} aria-hidden="true" /></span>
            <div><h2>Segurança</h2><p>Altera a password de acesso</p></div>
          </header>
          <div className="admin-conta-corpo"><AlterarPasswordForm action={atualizarPasswordConta} /></div>
        </section>

        {temPainelProprio && (
          <section className="admin-conta-seccao admin-conta-ligacao">
            <header>
              <span><GraduationCap size={20} aria-hidden="true" /></span>
              <div><h2>As tuas aulas</h2><p>Foto, disciplinas e agenda de professor</p></div>
            </header>
            <Link href="/dashboard">Abrir painel de professor <span aria-hidden="true">→</span></Link>
          </section>
        )}

        {/* As notificações são da CONTA, não do papel: quem é
            professor e da secretaria ao mesmo tempo liga uma vez e
            recebe tudo. Por isso esta secção está fora do bloco de
            professor. */}
        <section className="admin-conta-seccao">
          <header>
            <span><MonitorCog size={20} aria-hidden="true" /></span>
            <div><h2>Aparência</h2><p>Escolhe como vês a aplicação</p></div>
          </header>
          <div className="admin-conta-corpo"><SeletorAparencia /></div>
        </section>

        <section className="admin-conta-seccao">
          <header>
            <span><Bell size={20} aria-hidden="true" /></span>
            <div><h2>Notificações</h2><p>Avisos importantes neste aparelho</p></div>
          </header>
          <div className="admin-conta-corpo">
            {chavePublica ? (
              <AtivarNotificacoes chavePublica={chavePublica} endpointsGuardados={endpoints} />
            ) : (
              <p className="text-sm text-foreground/60">As notificações ainda não estão configuradas nesta instalação.</p>
            )}
          </div>
        </section>

        <section className="admin-conta-sair">
          <form action={logout}>
            <button type="submit"><LogOut size={19} aria-hidden="true" /> Sair da conta</button>
          </form>
        </section>

        <section className="admin-conta-perigo">
          <header><ShieldAlert size={20} aria-hidden="true" /><strong>Zona sensível</strong></header>
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
import { VoltarAtras } from '@/components/voltar-atras'
