import { Suspense } from 'react'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { BottomNavigation, type ItemNav } from '@/components/bottom-navigation'

// Nav do encarregado para as páginas de /aluno que não pertencem a um
// filho em concreto — avisos e calendário escolar.
//
// Estas páginas estavam a ficar sem navegação nenhuma: /aluno não tinha
// layout, e o layout de /aluno/[alunoId] só cobre a sua própria pasta.
// Como "Avisos" é um separador da barra, quem lá entrava perdia a barra
// e ficava só com a seta de voltar.
//
// O grupo "(gerais)" existe para o layout não envolver também
// /aluno/[alunoId] — esse já tem o seu, com destinos apontados ao filho
// que está a ser visto, e dois layouts empilhados dariam duas barras. Os
// parênteses mantêm os URLs iguais: /aluno/notificacoes continua a ser
// /aluno/notificacoes.
async function NavegacaoGeral() {
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user || profile?.tipo !== 'aluno') return null

  // Sem filho no URL, os destinos de "Agenda" e "Aluno" apontam ao
  // primeiro da conta — o mesmo critério que /dashboard usa quando
  // ainda não há filho escolhido.
  const { data: alunos } = await supabase
    .from('alunos')
    .select('id')
    .eq('encarregado_id', user.id)
    .order('criado_em')
    .limit(1)
  const alunoId = alunos?.[0]?.id

  const nav: ItemNav[] = [
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
      correspondencia: 'exata',
    },
    { href: '/aluno/notificacoes', label: 'Avisos', icone: 'notificacoes' },
    { href: '/dashboard/conta', label: 'Conta', icone: 'perfil' },
  ]

  return <BottomNavigation itens={nav} />
}

export default function AlunoGeraisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <NavegacaoGeral />
      </Suspense>
    </>
  )
}
