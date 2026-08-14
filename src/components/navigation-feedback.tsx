'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// O App Router mantém a página anterior visível enquanto algumas rotas de
// servidor carregam. Sem feedback, sobretudo numa ligação lenta ao Supabase,
// parece que o toque não funcionou. Este indicador cobre todas as ligações
// internas, não apenas a navegação inferior.
export function NavigationFeedback() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pesquisa = searchParams.toString()
  const [aNavegar, setANavegar] = useState(false)
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    setANavegar(false)
    setMostrar(false)
  }, [pathname, pesquisa])

  useEffect(() => {
    function aoClicar(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const origem = event.target
      if (!(origem instanceof Element)) return

      const ligacao = origem.closest('a[href]') as HTMLAnchorElement | null
      if (!ligacao || ligacao.target === '_blank' || ligacao.hasAttribute('download')) return

      const destino = new URL(ligacao.href, window.location.href)
      if (destino.origin !== window.location.origin) return
      if (
        destino.pathname === window.location.pathname &&
        destino.search === window.location.search
      ) {
        return
      }

      setANavegar(true)
    }

    document.addEventListener('click', aoClicar, true)
    return () => document.removeEventListener('click', aoClicar, true)
  }, [])

  // Evita que uma falha de rede deixe a interface coberta indefinidamente.
  useEffect(() => {
    if (!aNavegar) return
    const atraso = window.setTimeout(() => setMostrar(true), 220)
    const limite = window.setTimeout(() => setANavegar(false), 12_000)
    return () => {
      window.clearTimeout(atraso)
      window.clearTimeout(limite)
    }
  }, [aNavegar])

  if (!aNavegar || !mostrar) return null

  return (
    <div className="navegacao-progresso" role="status" aria-label="A abrir a próxima página">
      <span />
    </div>
  )
}
