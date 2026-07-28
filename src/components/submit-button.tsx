'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  textoAGuardar = 'A guardar...',
  className,
}: {
  children: React.ReactNode
  textoAGuardar?: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && (
        <span className="botao-spinner" aria-hidden="true" />
      )}
      {pending ? textoAGuardar : children}
    </button>
  )
}
