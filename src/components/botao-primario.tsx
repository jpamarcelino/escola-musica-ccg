import Link from 'next/link'

// Botão primário do DESIGN_SYSTEM.md (secção 6). A sombra é a única
// permitida em toda a app, e só deve haver um destes por ecrã.
export function BotaoPrimario({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex h-[52px] w-full items-center justify-center rounded-[13px] text-[15.5px] font-semibold text-white"
      style={{
        backgroundColor: 'var(--color-azul-fundo)',
        boxShadow: '0 7px 18px rgba(27,79,122,.26)',
      }}
    >
      {children}
    </Link>
  )
}
