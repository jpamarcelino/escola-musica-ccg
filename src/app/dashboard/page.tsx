import Link from 'next/link'
import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import { OptionCard } from '@/components/option-card'
import { InstalarCallout } from '@/components/instalar-callout'

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
    .select('nome, tipo, admin, programa')
    .eq('id', user.id)
    .single()

  let notificacoesPorLer = 0
  if (profile?.tipo === 'aluno') {
    const { count } = await supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('lida', false)
    notificacoesPorLer = count ?? 0
  }

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
          <div className="hub-stack">
            <OptionCard href="/aluno/pedido" nome="Pedir Aula" wide index={1} />
            <OptionCard href="/aluno/horario" nome="Consultar Horário" wide index={2} />
            <OptionCard href="/aluno/calendario" nome="Calendário Escolar" wide index={3} />
            <OptionCard href="/aluno/materiais" nome="Materiais das Aulas" wide index={4} />
            <OptionCard
              href="/aluno/notificacoes"
              nome="Notificações"
              wide
              index={5}
              badge={notificacoesPorLer}
            />
          </div>
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
