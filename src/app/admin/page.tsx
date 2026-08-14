import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import { PaginaComHero, HeroSaudacao } from '@/components/hero-section'
import { TituloSeccao, LinhaLista, GrupoLista } from '@/components/lista'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin, super_admin, tipo')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const [{ data: nomeData }, { data: perfisData }, { data: matriculasData }, { count: recomendacoesPorValidar }] =
    await Promise.all([
      supabase.from('profiles').select('nome').eq('id', user.id).single(),
      supabase.from('perfis_escola').select('tipo'),
      supabase.from('matriculas').select('estado'),
      supabase
        .from('recomendacoes')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'registada'),
    ])

  const primeiroNome = (nomeData?.nome ?? '').trim().split(/\s+/)[0] || 'bem-vindo'
  const alunos = (perfisData ?? []).filter((p) => p.tipo === 'aluno').length
  const professores = (perfisData ?? []).filter((p) => p.tipo === 'professor').length
  const totalConfirmadas = (matriculasData ?? []).filter((m) => m.estado === 'confirmado').length
  const totalPendentes = (matriculasData ?? []).filter((m) => m.estado === 'a_escolher').length

  return (
    <PaginaComHero
      comBottomNav
      hero={
        <div className="space-y-[20px]">
          <HeroSaudacao nome={primeiroNome} contexto="Visão geral da escola" />
          <div>
            <p
              className="text-[56px] font-bold leading-[1]"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              {totalPendentes}
            </p>
            <p className="mt-[4px] text-[15px]">
              {totalPendentes === 1 ? 'pedido de aula por confirmar' : 'pedidos de aula por confirmar'}
            </p>
          </div>
        </div>
      }
    >
      <section className="grid grid-cols-3 gap-[8px]">
        {[
          { numero: alunos, legenda: 'Alunos' },
          { numero: professores, legenda: 'Professores' },
          { numero: totalConfirmadas, legenda: 'Aulas confirmadas' },
        ].map((stat) => (
          <div
            key={stat.legenda}
            className="rounded-[var(--radius-medium)] px-[10px] py-[16px] text-center"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          >
            <p
              className="text-[26px] font-bold leading-[1.1]"
              style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-primary)' }}
            >
              {stat.numero}
            </p>
            <p className="mt-[2px] text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              {stat.legenda}
            </p>
          </div>
        ))}
      </section>

      <TituloSeccao>Financeiro e programa</TituloSeccao>
      <GrupoLista>
        <LinhaLista href="/admin/pagamentos" titulo="Mensalidades" />
        <LinhaLista
          href="/admin/recomendacoes"
          titulo="Programa de Recomendação"
          contexto={
            (recomendacoesPorValidar ?? 0) > 0
              ? `${recomendacoesPorValidar} por validar`
              : undefined
          }
        />
      </GrupoLista>

      <TituloSeccao>Pessoas</TituloSeccao>
      <GrupoLista>
        <LinhaLista href="/admin/alunos" titulo="Alunos" />
        <LinhaLista href="/admin/professores" titulo="Professores" />
        {perfilAtual.super_admin && (
          <LinhaLista href="/admin/administradores" titulo="Administradores" />
        )}
      </GrupoLista>

      <form action={logout} className="flex justify-center pt-[32px]">
        <LigacaoTerciaria>Sair</LigacaoTerciaria>
      </form>
    </PaginaComHero>
  )
}
