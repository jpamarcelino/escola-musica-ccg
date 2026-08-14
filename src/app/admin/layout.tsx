import { BottomNavigation, type ItemNav } from '@/components/bottom-navigation'

// Nav da área de administração. O "+" central é a tarefa recorrente mais
// frequente da secretaria: confirmar as mensalidades do mês.
const NAV: ItemNav[] = [
  { href: '/admin', label: 'Hoje', icone: 'inicio', correspondencia: 'exata' },
  { href: '/admin/alunos', label: 'Alunos', icone: 'alunos' },
  { href: '/admin/pagamentos', label: 'Pagamentos', icone: 'carteira' },
  { href: '/admin/professores', label: 'Professores', icone: 'professores' },
  { href: '/admin/conta', label: 'Mais', icone: 'mais' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNavigation itens={NAV} />
    </>
  )
}
