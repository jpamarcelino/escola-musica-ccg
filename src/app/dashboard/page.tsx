import Link from 'next/link'
import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import { criarAlunoDependente } from '@/lib/actions/aluno'
import { OptionCard } from '@/components/option-card'
import { InstalarCallout } from '@/components/instalar-callout'
import { SubmitButton } from '@/components/submit-button'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, tipo, admin, programa')
    .eq('id', user.id)
    .single()

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
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div
          className="entrada-esquerda text-left"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <h1 className="text-2xl">
            <span className="saudacao">Bem-vindo,</span>{' '}
            <span className="font-semibold text-foreground">{profile?.nome}</span>
          </h1>
          <p className="text-sm text-foreground/60">
            Estás autenticado como <strong>{profile?.tipo}</strong>
            {profile?.programa &&
              ` — Escola de ${profile.programa === 'musica' ? 'Música' : 'Dança'}`}
            .
          </p>
          {profile?.admin && (
            <Link href="/admin" className="text-sm underline">
              Visão geral (diretor)
            </Link>
          )}
        </div>

        <div className="entrada-esquerda" style={{ '--card-index': 1 } as CSSProperties}>
          <InstalarCallout />
        </div>

        {profile?.tipo === 'aluno' && (
          <>
            {erro && (
              <p className="rounded border border-red-600/30 p-3 text-sm text-red-600">{erro}</p>
            )}
            <div className="hub-stack">
              <OptionCard href="/dashboard/conta" nome="Conta" wide index={1} />
              {meusAlunos.map((a, idx) => (
                <OptionCard
                  key={a.id}
                  href={`/aluno/${a.id}`}
                  nome={a.nome}
                  wide
                  index={idx + 2}
                />
              ))}
            </div>
            <form
              action={criarAlunoDependente}
              className="flex flex-wrap items-end gap-2 rounded border border-foreground/15 p-3"
            >
              <div className="space-y-1">
                <label htmlFor="nome" className="block text-xs font-medium text-foreground/60">
                  Nome do aluno
                </label>
                <input
                  id="nome"
                  name="nome"
                  required
                  className="rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="dataNascimento"
                  className="block text-xs font-medium text-foreground/60"
                >
                  Data de nascimento
                </label>
                <input
                  id="dataNascimento"
                  name="dataNascimento"
                  type="date"
                  className="rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                />
              </div>
              <SubmitButton
                textoAGuardar="A adicionar..."
                className="rounded border border-foreground/20 px-3 py-2 text-sm"
              >
                Adicionar Aluno
              </SubmitButton>
            </form>
          </>
        )}

        {profile?.tipo === 'professor' && (
          <div className="hub-stack">
            <OptionCard
              href="/dashboard/conta"
              nome="Conta"
              wide
              index={1}
            />
            <OptionCard
              href="/dashboard/pedidos"
              nome="Pedidos de Aula"
              wide
              index={2}
              badge={pedidosPendentes}
            />
            <OptionCard
              href="/dashboard/presencas"
              nome="Presenças"
              wide
              index={3}
            />
            <OptionCard
              href="/dashboard/horarios"
              nome="Gestão de Horários"
              wide
              index={4}
            />
            <OptionCard
              href="/dashboard/agenda"
              nome="Horários e Alunos"
              wide
              index={5}
            />
            <OptionCard
              href="/dashboard/calendario"
              nome="Calendário Escolar"
              wide
              index={6}
            />
          </div>
        )}

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
