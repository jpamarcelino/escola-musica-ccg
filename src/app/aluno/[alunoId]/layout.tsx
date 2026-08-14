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
    { href: '/dashboard', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
    { href: `/aluno/${alunoId}/horario`, label: 'Agenda', icone: 'calendario' },
    { href: `/aluno/${alunoId}`, label: 'Aluno', icone: 'alunos', correspondencia: 'exata' },
    { href: '/aluno/notificacoes', label: 'Avisos', icone: 'notificacoes' },
    { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
  ]

  return (
    <>
      {children}
      <BottomNavigation itens={nav} />
    </>
  )
}
