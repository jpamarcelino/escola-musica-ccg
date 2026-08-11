import Link from 'next/link'

// Botão secundário do DESIGN_SYSTEM.md (secção 6): transparente, texto e
// borda de 1.5px a "--azul-fundo", mesma altura do primário.
//
// Como o primário: com "href" é ligação, sem ele é botão de submissão.
const CLASSES =
  'flex h-[52px] w-full items-center justify-center rounded-[13px] border-[1.5px] border-[var(--color-azul-fundo)] text-[15.5px] font-semibold text-[var(--color-azul-fundo)]'

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
