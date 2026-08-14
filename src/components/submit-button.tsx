'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  textoAGuardar = 'A guardar...',
  className,
  style,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode
  textoAGuardar?: string
  className?: string
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending || disabled} data-pending={pending || undefined} aria-busy={pending} className={className} style={style} onClick={onClick}>
      <span className="submit-button-conteudo" aria-live="polite">
        {pending && <span className="botao-spinner" aria-hidden="true" />}
        <span key={pending ? 'pending' : 'idle'} className="motion-label-swap">{pending ? textoAGuardar : children}</span>
      </span>
    </button>
  )
}
