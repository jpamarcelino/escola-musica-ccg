import { BottomNavigation, type ItemNav } from '@/components/bottom-navigation'

// Nav do encarregado dentro da área de um aluno específico — os destinos
// de horário e pedido apontam para ESTE aluno, não para o primeiro da
// conta como acontece no /dashboard (onde ainda não há aluno escolhido).
export default async function AlunoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params

  const nav: ItemNav[] = [
    { href: '/dashboard', label: 'Início', icone: 'inicio' },
    { href: `/aluno/${alunoId}/horario`, label: 'Horário e Aulas', icone: 'calendario' },
    { href: `/aluno/${alunoId}/pedido`, label: 'Pedir Aula', icone: 'mais', central: true },
    { href: '/aluno/notificacoes', label: 'Notificações', icone: 'notificacoes' },
    { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
  ]

  return (
    <>
      {children}
      <BottomNavigation itens={nav} />
    </>
  )
}
