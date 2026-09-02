'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// Seta de voltar para páginas que se alcançam de vários sítios.
//
// Os documentos legais abrem-se do rodapé público, do registo e da área
// de Conta. Uma ligação fixa manda toda a gente para o mesmo destino: quem
// vinha da Conta ia parar ao índice legal, e ao sair do índice caía na
// página Hoje — três ecrãs para voltar a um.
//
// O "destino" fica como rede: numa aba aberta de raiz nesta página, ou na
// PWA a arrancar aqui, não há para onde recuar.
export function VoltarAtras({
  destino,
  className,
  rotulo = 'Voltar',
}: {
  destino: string
  className?: string
  rotulo?: string
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
      <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
