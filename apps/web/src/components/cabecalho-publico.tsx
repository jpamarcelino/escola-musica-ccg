'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SimboloCCG } from '@/components/simbolo-ccg'

// Áreas com casa própria: cada uma traz o seu cabeçalho e a sua barra
// inferior, e um segundo cabeçalho por cima seria ruído. Uma lista de
// exclusões (e não de inclusões) é deliberada — assim, uma página
// pública nova nasce já com a marca sem ninguém se lembrar disso.
const AREAS_COM_CHROME_PROPRIO = ['/dashboard', '/admin', '/aluno']

// A home tem a sua própria barra, com a marca e ainda "Entrar" e "Criar
// conta". Repetir aqui a marca dava-lhe duas.
const HOME = '/'

// O mesmo, para os ecrãs já migrados para o design vitrine: cada um traz
// o seu topo, com a seta de voltar e a marca no sítio que o desenho lhe
// deu. Esta lista encolhe à medida que o resto da app for migrando —
// quando não sobrar nenhum ecrã antigo, o componente inteiro sai.
const ECRAS_VITRINE = ['/login', '/registo', '/pedir-aula', '/professor']

export function CabecalhoPublico() {
  const caminho = usePathname()

  if (caminho === HOME) return null
  if (ECRAS_VITRINE.some((a) => caminho === a || caminho.startsWith(`${a}/`))) return null
  if (AREAS_COM_CHROME_PROPRIO.some((a) => caminho === a || caminho.startsWith(`${a}/`))) {
    return null
  }

  return (
    <header className="cabecalho-publico">
      {/* O símbolo sozinho não diz "início" a quem não conhece a
          convenção, e o nome da instituição ao lado é pequeno demais
          para servir de instrução. Daí o rótulo acessível explícito. */}
      <Link href="/" aria-label="Centro Cultural da Guarda — ir para a página inicial">
        <SimboloCCG />
        <small>Centro Cultural da Guarda</small>
      </Link>
    </header>
  )
}
