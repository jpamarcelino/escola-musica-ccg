'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// A seta de "voltar" para páginas que se alcançam de vários sítios.
//
// O BackButton normal é uma ligação para um sítio fixo, e isso serve a
// maioria dos ecrãs — numa árvore, o pai é sempre o mesmo. Mas /instalar
// chega-se da página pública, do login, da Home e das definições de
// notificações, e uma ligação fixa manda toda a gente para o mesmo sítio:
// quem lá chegou a partir da Conta ia parar ao ecrã de entrar.
//
// Daí voltar mesmo atrás. O "href" fica como rede: numa aba aberta de
// raiz nesta página — ou na PWA a arrancar aqui — não há para onde
// recuar, e sem ele a seta não fazia nada.
// Houve navegação DENTRO da app até aqui?
//
// history.length não serve para responder: uma aba nova começa em
// about:blank e já conta 2 antes de a app abrir — recuar aí dava uma
// página em branco. O que se pergunta é outra coisa: o documento atual
// abriu nesta página ou noutra? Uma navegação do App Router não troca de
// documento, por isso se o endereço com que a página foi carregada é
// diferente do de agora, chegou-se aqui por dentro da app — e recuar é
// seguro.
function veioDeDentroDaApp(caminhoAtual: string): boolean {
  const [entrada] = performance.getEntriesByType('navigation')
  if (!entrada) return false
  try {
    return new URL(entrada.name).pathname !== caminhoAtual
  } catch {
    return false
  }
}

export function BotaoVoltarHistorico({
  href,
  className = 'back-button',
  children,
}: {
  href: string
  // A seta veste-se conforme o ecrã: quadrada com borda na linguagem
  // antiga, disco de papel na vitrine.
  className?: string
  children?: React.ReactNode
}) {
  const router = useRouter()
  const caminho = usePathname()

  return (
    <button
      type="button"
      className={className}
      aria-label="Voltar"
      onClick={() => {
        if (veioDeDentroDaApp(caminho)) {
          router.back()
        } else {
          router.push(href)
        }
      }}
    >
      {children ?? <ChevronLeft aria-hidden="true" strokeWidth={1.5} />}
    </button>
  )
}
