'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'

type SistemaId = 'ios' | 'android'

const ICONE_PARTILHA = (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v12" strokeLinecap="round" />
    <path d="M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="5" y="11" width="14" height="10" rx="2" />
  </svg>
)

const ICONE_MENU = (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
)

const ICONE_MAIS = (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
  </svg>
)

const PASSOS: Record<SistemaId, { icone: React.ReactNode; texto: string }[]> = {
  ios: [
    { icone: null, texto: 'Abre esta página no Safari (não funciona no Chrome ou no Instagram dentro do iPhone).' },
    { icone: ICONE_PARTILHA, texto: 'Toca no ícone de Partilha, na barra de baixo do ecrã (o quadrado com a seta para cima).' },
    { icone: null, texto: 'Desliza a lista de opções e toca em "Adicionar ao Ecrã Principal".' },
    { icone: null, texto: 'Toca em "Adicionar", no canto superior direito.' },
  ],
  android: [
    { icone: null, texto: 'Abre esta página no Chrome.' },
    { icone: ICONE_MENU, texto: 'Toca no menu de três pontos, no canto superior direito.' },
    { icone: ICONE_MAIS, texto: 'Toca em "Instalar aplicação" (ou "Adicionar ao ecrã principal").' },
    { icone: null, texto: 'Confirma. O ícone aparece no teu ecrã principal como qualquer outra app.' },
  ],
}

export default function InstalarPage() {
  const [sistema, setSistema] = useState<SistemaId>('ios')

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/login" />
          <h1 className="text-2xl font-semibold text-foreground">Instalar a app</h1>
        </div>

        <p className="text-sm text-foreground/60">
          Podes adicionar esta página ao ecrã principal do teu telemóvel, para
          abrir como se fosse uma app instalada — sem precisares da loja de
          aplicações. Os passos são diferentes consoante o telemóvel.
        </p>

        <div className="presencas-tabs">
          <button
            type="button"
            onClick={() => setSistema('ios')}
            className={`presencas-tab${sistema === 'ios' ? ' ativo' : ''}`}
          >
            iPhone / iPad
          </button>
          <button
            type="button"
            onClick={() => setSistema('android')}
            className={`presencas-tab${sistema === 'android' ? ' ativo' : ''}`}
          >
            Android
          </button>
        </div>

        <ol className="space-y-3">
          {PASSOS[sistema].map((passo, idx) => (
            <li key={idx} className="lista-item flex items-center gap-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm text-foreground">{passo.texto}</span>
              {passo.icone && (
                <span className="flex-none text-brand" aria-hidden="true">
                  {passo.icone}
                </span>
              )}
            </li>
          ))}
        </ol>

        <p className="text-xs text-foreground/50">
          Não encontras estas opções? Confirma que estás a usar o Safari (no
          iPhone) ou o Chrome (no Android) — outros navegadores nem sempre
          têm esta funcionalidade.
        </p>

        <Link href="/login" className="text-sm underline">
          Voltar ao login
        </Link>
      </div>
    </main>
  )
}
