import { BottomNavigation, type ItemNav } from '@/components/bottom-navigation'

// Nav da área de administração. O "+" central é a tarefa recorrente mais
// frequente da secretaria: confirmar as mensalidades do mês.
const NAV: ItemNav[] = [
  { href: '/admin', label: 'Visão geral', icone: 'inicio' },
  { href: '/admin/alunos', label: 'Alunos', icone: 'alunos' },
  {
    href: '/admin/pagamentos/confirmar',
    label: 'Confirmar mensalidades',
    icone: 'mais',
    central: true,
  },
  { href: '/admin/professores', label: 'Professores', icone: 'professores' },
  { href: '/admin/conta', label: 'Conta', icone: 'perfil' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNavigation itens={NAV} />
    </>
  )
}
