import Link from 'next/link'

// Botão primário v2 (DESIGN_SYSTEM_V2.md secção 10): pill, fundo
// --color-ink, texto branco, 56px. Um só por ecrã.
//
// O fundo tem um token próprio em vez de ir direto ao --color-ink. No
// tema escuro o --color-ink é quase branco — e está certo assim, porque
// no resto da app ele é COR DE TEXTO e de contornos (o botão secundário,
// as pastilhas de borda). Aqui é uma SUPERFÍCIE com texto branco por
// cima, e branco sobre branco não se lê. O token separa os dois papéis:
// em claro cai no --color-ink de sempre, no escuro o tema dá-lhe um
// azul.
//
// Com "href" é uma ligação; sem ele, um botão de submissão de formulário.
const CLASSES =
  'flex h-[56px] w-full items-center justify-center rounded-[var(--radius-pill)] text-[15.5px] font-semibold text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-mid)] motion-reduce:transition-none motion-reduce:active:scale-100'

const ESTILO = {
  backgroundColor: 'var(--color-botao-primario, var(--color-ink))',
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
