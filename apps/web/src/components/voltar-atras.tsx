'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// A seta de voltar da app inteira.
//
// Uma ligação fixa não volta: vai sempre ao mesmo sítio, venha a pessoa
// de onde vier. Quem abria um aviso a partir da caixa de entrada e
// carregava na seta ia parar ao mesmo ecrã que quem lá tinha chegado por
// outro caminho — e a página de onde vinha ficava a duas ou três
// navegações de distância.
//
// O "destino" fica como rede: numa aba aberta de raiz nesta página, na
// PWA a arrancar aqui, ou num endereço aberto de uma notificação, não há
// para onde recuar.
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
  const caminho = usePathname()

  return (
    <button
      type="button"
      className={className}
      aria-label={rotulo}
      onClick={() => {
        // history.length não serve para saber se dá para recuar: uma aba
        // nova começa em about:blank e já conta 2. O que se pergunta é
        // outra coisa — o documento abriu nesta página ou noutra? Uma
        // navegação do App Router não troca de documento, por isso um
        // endereço de carregamento diferente do atual quer dizer que se
        // chegou aqui por dentro da app, e recuar é seguro.
        const [entrada] = performance.getEntriesByType('navigation')
        let veioDeDentro = false
        try {
          veioDeDentro = !!entrada && new URL(entrada.name).pathname !== caminho
        } catch {
          veioDeDentro = false
        }
        if (veioDeDentro) router.back()
        else router.push(destino)
      }}
    >
      {children ?? <ChevronLeft size={tamanho} strokeWidth={2} aria-hidden="true" />}
    </button>
  )
}
