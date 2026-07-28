'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  textoAGuardar = 'A guardar...',
  className,
  onClick,
}: {
  children: React.ReactNode
  textoAGuardar?: string
  className?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className={className} onClick={onClick}>
      {pending && (
        <span className="botao-spinner" aria-hidden="true" />
      )}
      {pending ? textoAGuardar : children}
    </button>
  )
}
