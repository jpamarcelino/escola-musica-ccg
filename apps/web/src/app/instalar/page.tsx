'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BotaoVoltarHistorico } from '@/components/botao-voltar-historico'
import { SimboloCCG } from '@/components/simbolo-ccg'
import { RodapeVitrine } from '@/components/rodape-vitrine'

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

  return (
    <main id="conteudo-principal" className="v-pagina">
      <div className="v-folha">
        <div className="v-topo">
          {/* A seta recua de verdade: chega-se aqui da página pública, do
              login, da Home e das definições de notificações. */}
          <BotaoVoltarHistorico href="/" className="v-voltar">
            ‹
          </BotaoVoltarHistorico>
          <span className="v-topo-marca" aria-hidden="true">
            <SimboloCCG />
          </span>
        </div>

        <div style={{ padding: '34px 22px 0' }}>
          <p className="v-sobretitulo">Sem loja de aplicações</p>
          <h1 className="v-titulo">
            Instalar
            <br />
            no telemóvel
          </h1>
          <div className="v-traco" />
          <p className="v-entrada">
            Podes juntar esta página ao ecrã principal e abri-la como uma app. Os passos mudam
            conforme o telemóvel.
          </p>
        </div>

        <div className="v-separadores" role="tablist" aria-label="Sistema operativo">
          <button
            type="button"
            role="tab"
            aria-selected={sistema === 'ios'}
            aria-controls="passos-instalacao"
            onClick={() => setSistema('ios')}
          >
            iPhone / iPad
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sistema === 'android'}
            aria-controls="passos-instalacao"
            onClick={() => setSistema('android')}
          >
            Android
          </button>
        </div>

        <div id="passos-instalacao" role="tabpanel" key={sistema} className="v-cartao-passos">
          <ol>
            {PASSOS[sistema].map((passo, idx) => (
              <li key={idx}>
                <b>{idx + 1}</b>
                <span>{passo.texto}</span>
                {passo.icone && <i aria-hidden="true">{passo.icone}</i>}
              </li>
            ))}
          </ol>
        </div>

        <p className="v-nota" style={{ margin: '18px 22px 0' }}>
          Não encontras estas opções? Confirma que estás a usar o Safari (no iPhone) ou o Chrome
          (no Android) — outros navegadores nem sempre têm esta funcionalidade.
        </p>

        <div className="v-ligacoes">
          <Link href="/login">Voltar a entrar</Link>
        </div>

        <RodapeVitrine />
      </div>
    </main>
  )
}
