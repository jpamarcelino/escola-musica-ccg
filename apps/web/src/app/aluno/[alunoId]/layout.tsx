import { getAvisosPorLer } from '@/lib/auth-context'
import { BottomNavigation } from '@/components/bottom-navigation'
import { comAvisosPorLer, navAluno } from '@/lib/navegacao'

// Nav da Conta CCG dentro da área de um aluno específico — os destinos de
// agenda e de perfil apontam para ESTE aluno, tirado do URL. Fora daqui a
// barra é a de família (ver src/lib/navegacao.ts).
export default async function AlunoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params

  return (
    <>
      <div className="app-shell-content">{children}</div>
      <BottomNavigation itens={comAvisosPorLer(navAluno(alunoId), await getAvisosPorLer('familia'))} />
    </>
  )
}
