import Link from 'next/link'

// Botão secundário v2 (DESIGN_SYSTEM_V2.md secção 10): pill,
// transparente, borda 1.5px --color-ink. Mesma altura do primário.
//
// Como o primário: com "href" é ligação, sem ele é botão de submissão.
const CLASSES =
  'flex h-[56px] w-full items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] text-[15.5px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-raised)] active:bg-[var(--color-linha)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-mid)] motion-reduce:transition-none'

export function BotaoSecundario({
  href,
  children,
  disabled = false,
}: {
  href?: string
  children: React.ReactNode
  disabled?: boolean
}) {
  if (href) {
    return (
      <Link href={href} className={CLASSES}>
        {children}
      </Link>
    )
  }

  return (
    <button type="submit" disabled={disabled} className={`${CLASSES} disabled:opacity-50`}>
      {children}
    </button>
  )
}
