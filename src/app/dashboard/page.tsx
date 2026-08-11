import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import { criarAlunoDependente } from '@/lib/actions/aluno'
import { InstalarCallout } from '@/components/instalar-callout'
import { SubmitButton } from '@/components/submit-button'
import { CartaoLink } from '@/components/cartao-link'
import { Cartao } from '@/components/cartao'
import { FundoPapel } from '@/components/fundo-papel'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { CampoTexto } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'

export default async function DashboardPage({
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
    .select('nome, perfis_escola(tipo, admin, programa)')
    .eq('id', user.id)
    .single()

  const profileRow = profileRowData as {
    nome: string
    perfis_escola: { tipo: string; admin: boolean; programa: string | null } | null
  } | null

  const profile = profileRow
    ? {
        nome: profileRow.nome,
        tipo: profileRow.perfis_escola?.tipo,
        admin: profileRow.perfis_escola?.admin,
        programa: profileRow.perfis_escola?.programa,
      }
    : null

  // Contas admin (direção/secretaria, sem hub de professor nem de aluno)
  // vão direto para a Visão geral — só se ainda tiverem acesso (um super
  // admin pode ter revogado o "admin" sem mudar o tipo da conta).
  if (profile?.tipo === 'admin' && profile.admin) {
    redirect('/admin')
  }

  const { data: meusAlunosData } =
    profile?.tipo === 'aluno'
      ? await supabase
          .from('alunos')
          .select('id, nome')
          .eq('encarregado_id', user.id)
          .order('criado_em')
      : { data: [] }
  const meusAlunos = meusAlunosData ?? []

  let pedidosPendentes = 0
  if (profile?.tipo === 'professor') {
    const { count } = await supabase
      .from('matriculas')
      .select('id', { count: 'exact', head: true })
      .eq('professor_id', user.id)
      .eq('estado', 'a_escolher')
    pedidosPendentes = count ?? 0
  }

  return (
    <FundoPapel largura="larga">
      <div className="space-y-[26px]">
        <div>
          <h1
            className="text-[22px] font-semibold leading-[1.2]"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
          >
            Bem-vindo, {profile?.nome}
          </h1>
          <p className="mt-[4px] text-[12.5px]" style={{ color: 'var(--color-tinta-suave)' }}>
            Estás autenticado como <strong>{profile?.tipo}</strong>
            {profile?.programa &&
              ` — Escola de ${profile.programa === 'musica' ? 'Música' : 'Dança'}`}
            .
          </p>
          {profile?.admin && (
            <Link
              href="/admin"
              className="mt-[8px] inline-block text-[14px] font-medium underline [text-underline-offset:3px]"
              style={{ color: 'var(--color-tinta-suave)' }}
            >
              Visão geral (diretor)
            </Link>
          )}
        </div>

        <InstalarCallout />

        {profile?.tipo === 'aluno' && (
          <>
            {erro && <MensagemErro>{erro}</MensagemErro>}

            <div className="flex flex-col gap-[11px]">
              <CartaoLink href="/dashboard/conta" nome="Conta" />
              {meusAlunos.map((a) => (
                <CartaoLink key={a.id} href={`/aluno/${a.id}`} nome={a.nome} />
              ))}
            </div>

            <Cartao>
              <form action={criarAlunoDependente} className="space-y-[14px]">
                <p
                  className="text-[9.5px] font-medium uppercase tracking-[0.16em]"
                  style={{ color: 'var(--color-tinta-suave)' }}
                >
                  Adicionar aluno
                </p>

                <CampoTexto id="nome" name="nome" label="Nome do aluno" />
                <CampoTexto
                  id="dataNascimento"
                  name="dataNascimento"
                  label="Data de nascimento"
                  type="date"
                  required={false}
                />

                <SubmitButton
                  textoAGuardar="A adicionar..."
                  className="flex h-[52px] w-full items-center justify-center gap-[8px] rounded-[13px] border-[1.5px] border-[var(--color-azul-fundo)] text-[15.5px] font-semibold text-[var(--color-azul-fundo)] disabled:opacity-50"
                >
                  Adicionar Aluno
                </SubmitButton>
              </form>
            </Cartao>
          </>
        )}

        {profile?.tipo === 'professor' && (
          <div className="flex flex-col gap-[11px]">
            <CartaoLink href="/dashboard/conta" nome="Conta" />
            <CartaoLink
              href="/dashboard/pedidos"
              nome="Pedidos de Aula"
              contagem={pedidosPendentes}
            />
            <CartaoLink href="/dashboard/presencas" nome="Presenças" />
            <CartaoLink href="/dashboard/horarios" nome="Gestão de Horários" />
            <CartaoLink href="/dashboard/agenda" nome="Horários e Alunos" />
            <CartaoLink href="/dashboard/mensalidades" nome="Mensalidades" />
            <CartaoLink href="/dashboard/calendario" nome="Calendário Escolar" />
          </div>
        )}

        <form action={logout} className="flex justify-center pt-[12px]">
          <LigacaoTerciaria>Sair</LigacaoTerciaria>
        </form>
      </div>
    </FundoPapel>
  )
}
