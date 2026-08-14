'use client'

import { usePathname, useSearchParams } from 'next/navigation'

// Mantém o chrome da aplicação estável e anima apenas o conteúdo da rota.
// A chave inclui a pesquisa porque o pedido de aula usa query params como
// passos reais do wizard. Não introduz atrasos nem depende de uma biblioteca.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`

  return (
    <div key={routeKey} className="motion-page flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  )
}
