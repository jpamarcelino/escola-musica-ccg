import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

// Blocos de lista da content surface (DESIGN_SYSTEM_V2.md secções 7–8).
// Substituem os cartões de navegação da v1 nas páginas migradas:
// separação por fundo (--color-surface-raised) e espaço, não por borda.

// Título de secção com contagem opcional — "Pedidos por responder (3)".
export function TituloSeccao({
  children,
  contagem,
  acao,
}: {
  children: React.ReactNode
  contagem?: number
  acao?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-[12px] pb-[12px] pt-[24px] first:pt-0">
      <h2
        className="text-[17px] font-bold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {children}
        {typeof contagem === 'number' && contagem > 0 && (
          <span className="ml-[6px]" style={{ color: 'var(--color-text-secondary)' }}>
            ({contagem})
          </span>
        )}
      </h2>
      {acao}
    </div>
  )
}

// Linha de lista: título + contexto + (opcional) algo à direita.
// Com href é navegável (chevron); sem href é informativa.
export function LinhaLista({
  titulo,
  contexto,
  direita,
  href,
  icone,
}: {
  titulo: React.ReactNode
  contexto?: React.ReactNode
  // Conteúdo à direita: hora, valor, anel pequeno, badge…
  direita?: React.ReactNode
  href?: string
  // Avatar ou ícone à esquerda.
  icone?: React.ReactNode
}) {
  const conteudo = (
    <>
      {icone && <span className="shrink-0">{icone}</span>}
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[15px] font-semibold leading-[1.35]"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {titulo}
        </span>
        {contexto && (
          <span
            className="block truncate text-[13px] leading-[1.4]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {contexto}
          </span>
        )}
      </span>
      {direita && <span className="shrink-0 text-right">{direita}</span>}
      {href && (
        <ChevronRight
          size={18}
          strokeWidth={1.5}
          aria-hidden="true"
          className="shrink-0"
          style={{ color: 'var(--color-text-secondary)' }}
        />
      )}
    </>
  )

  const classes =
    'flex w-full items-center gap-[14px] rounded-[var(--radius-medium)] px-[16px] py-[14px] text-left'

  if (href) {
    return (
      <Link
        href={href}
        className={`${classes} transition-colors hover:bg-[var(--color-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-mid)] motion-safe:active:scale-[0.99]`}
        style={{ backgroundColor: 'var(--color-surface-raised)' }}
      >
        {conteudo}
      </Link>
    )
  }

  return (
    <div className={classes} style={{ backgroundColor: 'var(--color-surface-raised)' }}>
      {conteudo}
    </div>
  )
}

// Grupo de linhas com o espaçamento certo entre elas.
export function GrupoLista({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-[8px]">{children}</div>
}
