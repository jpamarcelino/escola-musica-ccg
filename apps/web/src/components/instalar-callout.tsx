'use client'

import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { CartaoLink } from '@/components/cartao-link'

// Só aparece em contexto de browser — quando a app já está instalada e
// aberta a partir do ecrã principal, o SO reporta "standalone" e o
// convite deixa de fazer sentido.
function estaInstalada() {
  const modoStandalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return modoStandalone || iosStandalone
}

// Ícone de linha, como manda a secção 6: nunca preenchido, "stroke-width"
// 1.5 e extremidades arredondadas.
function IconeTelemovel() {
  return <Smartphone width={26} height={26} strokeWidth={1.5} style={{ color: 'var(--color-azul-fundo)' }} />
}

export function InstalarCallout() {
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    setMostrar(!estaInstalada())
  }, [])

  if (!mostrar) return null

  return (
    <CartaoLink
      href="/instalar"
      nome="Instala a app no telemóvel"
      descricao="Acesso mais rápido, como uma app normal — vê como"
      icone={<IconeTelemovel />}
    />
  )
}
