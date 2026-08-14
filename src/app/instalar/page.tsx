'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { FundoPapel } from '@/components/fundo-papel'
import { Cartao } from '@/components/cartao'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'

type SistemaId = 'ios' | 'android'

// Ícones de linha, "stroke-width" 1.5 e extremidades arredondadas
// (DESIGN_SYSTEM.md, secção 6).
const ICONE_PARTILHA = (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v12" />
    <path d="M8 7l4-4 4 4" />
    <rect x="5" y="11" width="14" height="10" rx="2" />
  </svg>
)

// Exceção deliberada à regra dos ícones de linha: são os três pontos do
// menu do Chrome tal como aparecem no telemóvel. Desenhados a traço
// deixariam de se reconhecer.
const ICONE_MENU = (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </svg>
)

const ICONE_MAIS = (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
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

  // Alvos de toque com pelo menos 44px (secção 9).
  function classesSeparador(ativo: boolean) {
    return `h-[44px] flex-1 rounded-[13px] border text-[14px] font-medium transition-colors ${
      ativo
        ? 'border-[var(--color-azul-fundo)] bg-[var(--color-azul-fundo)] text-white'
        : 'border-[var(--color-linha)] bg-white text-[var(--color-tinta-suave)]'
    }`
  }

  return (
    <FundoPapel>
      <div className="space-y-[22px]">
        <PageHeader voltar="/login" titulo="Instalar a app" />

        <p
          className="text-[15px] leading-[1.6]"
          style={{ color: 'var(--color-tinta-suave)' }}
        >
          Podes adicionar esta página ao ecrã principal do teu telemóvel, para
          abrir como se fosse uma app instalada — sem precisares da loja de
          aplicações. Os passos são diferentes consoante o telemóvel.
        </p>

        <div className="flex gap-[8px]">
          <button
            type="button"
            onClick={() => setSistema('ios')}
            aria-pressed={sistema === 'ios'}
            className={classesSeparador(sistema === 'ios')}
          >
            iPhone / iPad
          </button>
          <button
            type="button"
            onClick={() => setSistema('android')}
            aria-pressed={sistema === 'android'}
            className={classesSeparador(sistema === 'android')}
          >
            Android
          </button>
        </div>

        <Cartao>
          <ol className="space-y-[14px]">
            {PASSOS[sistema].map((passo, idx) => (
              <li key={idx} className="flex items-center gap-[12px]">
                <span
                  className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[12.5px] font-semibold text-white"
                  style={{ backgroundColor: 'var(--color-azul-fundo)' }}
                >
                  {idx + 1}
                </span>
                <span
                  className="flex-1 text-[13px] leading-[1.5]"
                  style={{ color: 'var(--color-tinta)' }}
                >
                  {passo.texto}
                </span>
                {passo.icone && (
                  <span
                    className="flex-none"
                    style={{ color: 'var(--color-azul-fundo)' }}
                    aria-hidden="true"
                  >
                    {passo.icone}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Cartao>

        <p className="text-[12.5px] leading-[1.5]" style={{ color: 'var(--color-tinta-suave)' }}>
          Não encontras estas opções? Confirma que estás a usar o Safari (no
          iPhone) ou o Chrome (no Android) — outros navegadores nem sempre
          têm esta funcionalidade.
        </p>

        <div className="flex justify-center">
          <LigacaoTerciaria href="/login">Voltar ao login</LigacaoTerciaria>
        </div>
      </div>
    </FundoPapel>
  )
}
