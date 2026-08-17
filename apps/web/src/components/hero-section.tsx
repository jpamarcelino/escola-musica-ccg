import { agoraNaEscola } from '@ccg/core'

// Estrutura hero + content surface (DESIGN_SYSTEM_V2.md secção 7).
//
// O hero é a área em gradiente no topo — saudação, número dominante,
// anel. A content surface é a folha branca que se sobrepõe, com os
// cantos superiores muito arredondados. Juntas formam a "página v2".
//
// Só ecrãs de entrada usam isto (Homes, /, /admin). As páginas
// interiores usam cabeçalho branco simples — não reimplementar o
// gradiente por todo o lado.
export function PaginaComHero({
  hero,
  children,
  comBottomNav = false,
}: {
  hero: React.ReactNode
  children: React.ReactNode
  // Reserva espaço no fundo para a BottomNavigation flutuante não tapar
  // o último conteúdo.
  comBottomNav?: boolean
}) {
  return (
    <main
      id="conteudo-principal"
      className="flex flex-1 flex-col"
      style={{ background: 'var(--gradient-hero)' }}
    >
      <div className="px-[24px] pb-[32px] pt-[max(20px,env(safe-area-inset-top,0px))] text-white">{hero}</div>
      <div
        className={`flex-1 bg-white px-[20px] pt-[24px] ${comBottomNav ? 'pb-[calc(112px+env(safe-area-inset-bottom,0px))]' : 'pb-[32px]'}`}
        style={{
          borderTopLeftRadius: 'var(--radius-large)',
          borderTopRightRadius: 'var(--radius-large)',
        }}
      >
        <div className="mx-auto w-full max-w-[720px]">{children}</div>
      </div>
    </main>
  )
}

// Saudação do hero: "Bom dia, Francisco" com a hora certa do dia.
export function saudacaoDoDia(): string {
  const hora = agoraNaEscola().getHours()
  if (hora < 6) return 'Boa noite'
  if (hora < 13) return 'Bom dia'
  if (hora < 20) return 'Boa tarde'
  return 'Boa noite'
}

export function HeroSaudacao({
  nome,
  contexto,
}: {
  nome: string
  contexto?: React.ReactNode
}) {
  return (
    <div className="space-y-[6px]">
      <h1
        className="text-[32px] font-semibold leading-[1.15]"
        style={{ fontFamily: 'var(--font-fraunces)' }}
      >
        {saudacaoDoDia()}, {nome}
      </h1>
      {contexto && <div className="text-[15px] leading-[1.5]">{contexto}</div>}
    </div>
  )
}
