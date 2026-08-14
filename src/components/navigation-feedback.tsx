'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { EcraCarregamento } from '@/components/ecra-carregamento'

// O App Router mantém a página anterior visível enquanto algumas rotas de
// servidor carregam. Sem feedback, sobretudo numa ligação lenta ao Supabase,
// parece que o toque não funcionou. Este indicador cobre todas as ligações
// internas, não apenas a navegação inferior.
export function NavigationFeedback() {
  const pathname = usePathname()
  const [aNavegar, setANavegar] = useState(false)

  useEffect(() => {
    setANavegar(false)
  }, [pathname])

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
    const limite = window.setTimeout(() => setANavegar(false), 12_000)
    return () => window.clearTimeout(limite)
  }, [aNavegar])

  if (!aNavegar) return null

  return (
    <EcraCarregamento
      mensagem="A abrir…"
      contexto="Estamos a preparar a próxima página."
      cobrirEcra
    />
  )
}
