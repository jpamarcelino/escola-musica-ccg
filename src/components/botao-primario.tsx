import Link from 'next/link'

// Botão primário do DESIGN_SYSTEM.md (secção 6). A sombra é a única
// permitida em toda a app, e só deve haver um destes por ecrã.
//
// Com "href" é uma ligação; sem ele, um botão de submissão de formulário.
// São o mesmo objeto visual, por isso partilham as classes em vez de haver
// dois componentes a repetir a mesma afinação.
const CLASSES =
  'flex h-[52px] w-full items-center justify-center rounded-[13px] text-[15.5px] font-semibold text-white'

const ESTILO = {
  backgroundColor: 'var(--color-azul-fundo)',
  boxShadow: '0 7px 18px rgba(27,79,122,.26)',
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
