import { Suspense } from 'react'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { BottomNavigation } from '@/components/bottom-navigation'
import { NAV_CONTA } from '@/lib/navegacao'

// Nav da Conta CCG para as páginas de /aluno que não pertencem a um aluno
// em concreto — hoje só o calendário escolar (os avisos mudaram-se para
// /dashboard/avisos, por serem da conta e não de um aluno).
//
// Estas páginas estavam a ficar sem navegação nenhuma: /aluno não tinha
// layout, e o layout de /aluno/[alunoId] só cobre a sua própria pasta.
//
// O grupo "(gerais)" existe para o layout não envolver também
// /aluno/[alunoId] — esse já tem o seu, com destinos apontados ao aluno
// que está a ser visto, e dois layouts empilhados dariam duas barras. Os
// parênteses mantêm os URLs iguais: /aluno/calendario continua a ser
// /aluno/calendario.
async function NavegacaoGeral() {
  const { user, profile } = await getSchoolProfileContext()

  if (!user || profile?.tipo !== 'conta') return null

  // Sem aluno no URL, a barra é a de família — a mesma de /dashboard.
  // Nenhum separador abre um aluno escolhido por nós.
  return <BottomNavigation itens={NAV_CONTA} />
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
