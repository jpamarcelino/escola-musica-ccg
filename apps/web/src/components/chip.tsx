// Chip pill — usado no seletor de dia da semana, tags e filtros pequenos
// (DESIGN_SYSTEM_V2.md secção 5 e 11).
export function Chip({
  children,
  ativo = false,
  onClick,
  tom = 'claro',
}: {
  children: React.ReactNode
  ativo?: boolean
  onClick?: () => void
  // "claro" — usado sobre fundo branco (content surface).
  // "sobre-cor" — usado sobre o hero em gradiente.
  tom?: 'claro' | 'sobre-cor'
}) {
  const estiloClaro = ativo
    ? { backgroundColor: 'var(--color-ink)', color: '#ffffff' }
    : { backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-secondary)' }

  const estiloSobreCor = ativo
    ? { backgroundColor: '#ffffff', color: 'var(--color-ink)' }
    : { backgroundColor: 'rgba(255,255,255,.16)', color: 'rgba(255,255,255,.85)' }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? ativo : undefined}
      className="flex h-[36px] min-w-[36px] items-center justify-center rounded-[var(--radius-pill)] px-[14px] text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-mid)]"
      style={tom === 'sobre-cor' ? estiloSobreCor : estiloClaro}
    >
      {children}
    </button>
  )
}
