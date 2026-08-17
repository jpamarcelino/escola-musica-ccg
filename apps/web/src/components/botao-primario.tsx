import Link from 'next/link'

// Botão primário v2 (DESIGN_SYSTEM_V2.md secção 10): pill, fundo
// --color-ink, texto branco, 56px. Um só por ecrã.
//
// Com "href" é uma ligação; sem ele, um botão de submissão de formulário.
const CLASSES =
  'flex h-[56px] w-full items-center justify-center rounded-[var(--radius-pill)] text-[15.5px] font-semibold text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-mid)] motion-reduce:transition-none motion-reduce:active:scale-100'

const ESTILO = {
  backgroundColor: 'var(--color-ink)',
}

export function BotaoPrimario({
  href,
  children,
  disabled = false,
  onClick,
}: {
  href?: string
  children: React.ReactNode
  disabled?: boolean
  // Com "onClick" passa a botão normal em vez de submissão — é o caso do
  // pop-up da idade, que navega em vez de submeter um formulário.
  onClick?: () => void
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
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled}
      className={`${CLASSES} disabled:opacity-50`}
      style={ESTILO}
    >
      {children}
    </button>
  )
}
