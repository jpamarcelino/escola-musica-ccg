import { Suspense } from 'react'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { BottomNavigation, type ItemNav } from '@/components/bottom-navigation'

const NAV_PROFESSOR: ItemNav[] = [
  { href: '/dashboard', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
  { href: '/dashboard/agenda', label: 'Agenda', icone: 'calendario' },
  { href: '/dashboard/presencas', label: 'Presenças', icone: 'presencas' },
  { href: '/dashboard/pedidos', label: 'Pedidos', icone: 'pedidos' },
  { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
]

// A navegação inferior vive no layout para acompanhar o utilizador por
// todas as páginas de /dashboard/* — não é um enfeite da Home. Os
// destinos dependem do perfil (professor vs. encarregado), por isso o
// layout resolve o tipo de conta uma vez e escolhe a nav certa.
async function DashboardNavigation() {
  const { supabase, user, profile } = await getSchoolProfileContext()

  let nav: ItemNav[] | null = null

  if (user) {
    if (profile?.tipo === 'professor') {
      nav = NAV_PROFESSOR
    } else if (profile?.tipo === 'aluno') {
      const { data: alunos } = await supabase
        .from('alunos')
        .select('id')
        .eq('encarregado_id', user.id)
        .order('criado_em')
        .limit(1)
      const alunoId = alunos?.[0]?.id

      nav = [
        { href: '/dashboard', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
        {
          href: alunoId ? `/aluno/${alunoId}/horario` : '/dashboard',
          label: 'Agenda',
          icone: 'calendario',
        },
        {
          href: alunoId ? `/aluno/${alunoId}` : '/dashboard',
          label: 'Aluno',
          icone: 'alunos',
        },
        { href: '/aluno/notificacoes', label: 'Avisos', icone: 'notificacoes' },
        { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
      ]
    }
  }

  return nav ? <BottomNavigation itens={nav} /> : null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Sem padding aqui: as páginas com hero já reservam espaço para a nav
  // (comBottomNav), e as interiores usam o seu próprio padding.
  return (
    <>
      {children}
      {/* A navegação depende do perfil, mas não deve bloquear o loading da
          página. O Suspense permite enviar o fallback imediatamente enquanto
          esta consulta decorre em paralelo com o conteúdo. */}
      <Suspense fallback={<BottomNavigation itens={NAV_PROFESSOR} />}>
        <DashboardNavigation />
      </Suspense>
    </>
  )
}
