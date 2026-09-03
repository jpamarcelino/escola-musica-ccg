'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// A seta de voltar da app inteira.
//
// Usa sempre o destino declarado pela página. Depender do histórico
// criava ciclos reais: ficha do aluno -> agenda -> ficha -> agenda.
// Uma seta da interface deve ter um resultado previsível, incluindo em
// separadores abertos diretamente e em páginas vindas de notificações.
//
// "children" existe para os ecrãs que ainda não estão no Design Pinterest
// e desenham a seta com uma seta de texto — assim a marcação muda sem o
// aspeto mudar com ela.
export function VoltarAtras({
  destino,
  className,
  rotulo = 'Voltar',
  tamanho = 20,
  children,
}: {
  destino: string
  className?: string
  rotulo?: string
  // Cada folha desenha a seta ao seu tamanho: 23 px no Design Pinterest,
  // 24 px nos fluxos de presencas. Ficar por um so tamanho era encolher
  // metade das setas da app numa alteracao que nao e de desenho.
  tamanho?: number
  children?: React.ReactNode
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      className={className}
      aria-label={rotulo}
      onClick={() => router.push(destino)}
    >
      {children ?? <ChevronLeft size={tamanho} strokeWidth={2} aria-hidden="true" />}
    </button>
  )
}
