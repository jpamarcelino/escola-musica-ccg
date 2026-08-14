import Link from 'next/link'

// Ligação terciária do DESIGN_SYSTEM.md (secção 6): sem fundo nem borda.
// É o terceiro nível de ação, a seguir ao primário e ao secundário — quando
// há três ações num ecrã, nenhuma delas deve ter o mesmo peso das outras.
//
// Com "href" é uma ligação; sem ele, um botão de submissão de formulário
// (o "Sair" do hub, por exemplo), com o mesmo aspeto.
const CLASSES =
  'text-[14px] font-medium underline [text-underline-offset:3px] transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-azul)] motion-reduce:transition-none rounded-[4px]'

const ESTILO = { color: 'var(--color-tinta-suave)' }

export function LigacaoTerciaria({
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
      <Link href={href} className={CLASSES} style={ESTILO}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type="submit"
      disabled={disabled}
      className={`${CLASSES} disabled:opacity-50`}
      style={ESTILO}
    >
      {children}
    </button>
  )
}
