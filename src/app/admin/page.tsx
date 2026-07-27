import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { OptionCard } from '@/components/option-card'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('admin, super_admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: perfisData } = await supabase.from('profiles').select('tipo')
  const alunos = (perfisData ?? []).filter((p) => p.tipo === 'aluno').length
  const professores = (perfisData ?? []).filter((p) => p.tipo === 'professor').length

  const { data: matriculasData } = await supabase.from('matriculas').select('estado')
  const totalConfirmadas = (matriculasData ?? []).filter((m) => m.estado === 'confirmado').length
  const totalPendentes = (matriculasData ?? []).filter((m) => m.estado === 'a_escolher').length

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div
          className="entrada-esquerda flex items-center gap-3"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <BackButton href="/dashboard" />
          <div>
            <h1 className="text-2xl">
              <span className="saudacao">Visão</span>{' '}
              <span className="font-semibold text-foreground">geral</span>
            </h1>
            <p className="text-sm text-foreground/60">
              Só tu (e outros administradores) vês esta página.
            </p>
          </div>
        </div>

        <section
          className="entrada-esquerda grid grid-cols-2 gap-3 sm:grid-cols-4"
          style={{ '--card-index': 1 } as CSSProperties}
        >
          <div className="stat-tile">
            <p className="stat-tile-numero">{alunos}</p>
            <p className="stat-tile-legenda">Alunos</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{professores}</p>
            <p className="stat-tile-legenda">Professores</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totalConfirmadas}</p>
            <p className="stat-tile-legenda">Aulas confirmadas</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totalPendentes}</p>
            <p className="stat-tile-legenda">Pedidos por confirmar</p>
          </div>
        </section>

        <div className="hub-stack">
          <OptionCard href="/admin/pagamentos" nome="Mensalidades" wide index={2} />
          <OptionCard href="/admin/alunos" nome="Alunos" wide index={3} />
          <OptionCard href="/admin/professores" nome="Professores" wide index={4} />
          {perfilAtual.super_admin && (
            <OptionCard href="/admin/administradores" nome="Administradores" wide index={5} />
          )}
        </div>
      </div>
    </main>
  )
}
