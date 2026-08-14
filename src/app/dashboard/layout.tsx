import { createClient } from '@/lib/supabase/server'
import { BottomNavigation, type ItemNav } from '@/components/bottom-navigation'

// A navegação inferior vive no layout para acompanhar o utilizador por
// todas as páginas de /dashboard/* — não é um enfeite da Home. Os
// destinos dependem do perfil (professor vs. encarregado), por isso o
// layout resolve o tipo de conta uma vez e escolhe a nav certa.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let nav: ItemNav[] | null = null

  if (user) {
    const { data: perfil } = await supabase
      .from('perfis_escola')
      .select('tipo')
      .eq('id', user.id)
      .single()

    if (perfil?.tipo === 'professor') {
      nav = [
        { href: '/dashboard', label: 'Início', icone: 'inicio' },
        { href: '/dashboard/agenda', label: 'Horários e Alunos', icone: 'calendario' },
        { href: '/dashboard/pedidos', label: 'Pedidos de Aula', icone: 'mais', central: true },
        { href: '/dashboard/mensalidades', label: 'Mensalidades', icone: 'carteira' },
        { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
      ]
    } else if (perfil?.tipo === 'aluno') {
      const { data: alunos } = await supabase
        .from('alunos')
        .select('id')
        .eq('encarregado_id', user.id)
        .order('criado_em')
        .limit(1)
      const alunoId = alunos?.[0]?.id

      nav = [
        { href: '/dashboard', label: 'Início', icone: 'inicio' },
        {
          href: alunoId ? `/aluno/${alunoId}/horario` : '/dashboard',
          label: 'Horário e Aulas',
          icone: 'calendario',
        },
        {
          href: alunoId ? `/aluno/${alunoId}/pedido` : '/pedir-aula',
          label: 'Pedir Aula',
          icone: 'mais',
          central: true,
        },
        { href: '/aluno/notificacoes', label: 'Notificações', icone: 'notificacoes' },
        { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
      ]
    }
  }

  // Sem padding aqui: as páginas com hero já reservam espaço para a nav
  // (comBottomNav), e as interiores usam o seu próprio padding.
  return (
    <>
      {children}
      {nav && <BottomNavigation itens={nav} />}
    </>
  )
}
