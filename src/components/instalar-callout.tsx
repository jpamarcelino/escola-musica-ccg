'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Só aparece em contexto de browser — quando a app já está instalada e
// aberta a partir do ecrã principal, o SO reporta "standalone" e o
// convite deixa de fazer sentido.
function estaInstalada() {
  const modoStandalone = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return modoStandalone || iosStandalone
}

export function InstalarCallout() {
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    setMostrar(!estaInstalada())
  }, [])

  if (!mostrar) return null

  return (
    <div className="callout-instalar-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element -- decorativa, sem prioridade de carregamento */}
      <img src="/seta-instalar.png" alt="" className="callout-seta" aria-hidden="true" />
      <Link href="/instalar" className="callout-instalar">
        <span className="callout-instalar-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="callout-instalar-texto">
          <strong>Instala a app no telemóvel</strong>
          <span>Acesso mais rápido, como uma app normal — vê como</span>
        </span>
      </Link>
    </div>
  )
}
