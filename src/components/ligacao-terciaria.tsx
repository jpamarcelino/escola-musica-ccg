import Link from 'next/link'

// Ligação terciária do DESIGN_SYSTEM.md (secção 6): sem fundo nem borda.
// É o terceiro nível de ação, a seguir ao primário e ao secundário — quando
// há três ações num ecrã, nenhuma delas deve ter o mesmo peso das outras.
export function LigacaoTerciaria({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="text-[14px] font-medium underline [text-underline-offset:3px]"
      style={{ color: 'var(--color-tinta-suave)' }}
    >
      {children}
    </Link>
  )
}
