import { Suspense } from 'react'
import { getSchoolProfileContext, getAvisosPorLer } from '@/lib/auth-context'
import { BottomNavigation } from '@/components/bottom-navigation'
import { NAV_CONTA, NAV_PROFESSOR, comAvisosPorLer, ehContaCCG } from '@/lib/navegacao'

// A navegação inferior vive no layout para acompanhar o utilizador por
// todas as páginas de /dashboard/* — não é um enfeite da Home. Os
// destinos dependem do perfil (professor vs. Conta CCG), por isso o
// layout resolve o tipo de conta uma vez e escolhe a nav certa.
//
// Deixou de haver aqui qualquer consulta a "alunos": os destinos da Conta
// CCG são todos de família e não dependem de haver alunos, nem de qual
// deles. Antes procurava-se o primeiro aluno para preencher dois dos
// separadores, o que dava uma barra diferente conforme a ordem de criação
// dos filhos.
async function DashboardNavigation() {
  const { user, profile } = await getSchoolProfileContext()

  if (!user) return null
  // O professor passou a ter separador de avisos, e portanto a contagem
  // passou a ter onde aparecer.
  if (profile?.tipo === 'professor') {
    return <BottomNavigation itens={comAvisosPorLer(NAV_PROFESSOR, await getAvisosPorLer('professor'))} />
  }
  if (ehContaCCG(profile?.tipo)) {
    return <BottomNavigation itens={comAvisosPorLer(NAV_CONTA, await getAvisosPorLer('familia'))} />
  }
  return null
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
