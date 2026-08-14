'use client'

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PasswordInput({
  id,
  name,
  placeholder,
  required = true,
  minLength,
  autoComplete,
  className,
}: {
  id?: string
  name: string
  placeholder?: string
  required?: boolean
  minLength?: number
  autoComplete?: string
  className?: string
}) {
  const idGerado = useId()
  const idFinal = id ?? idGerado
  const [visivel, setVisivel] = useState(false)

  return (
    <div className="relative">
      <input
        id={idFinal}
        name={name}
        type={visivel ? 'text' : 'password'}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`${className ?? ''} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'Ocultar password' : 'Mostrar password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[4px] p-[2px] opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-azul)]"
        style={{ color: 'var(--color-tinta-suave)' }}
      >
        {visivel ? (
          <EyeOff width={18} height={18} strokeWidth={1.5} />
        ) : (
          <Eye width={18} height={18} strokeWidth={1.5} />
        )}
      </button>
    </div>
  )
}
