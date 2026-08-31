'use client'

import { useId, useState } from 'react'

// Campos do design vitrine. Só a casca: a validação e as Server Actions
// são as mesmas de sempre.

export function CampoVitrine({
  id,
  name,
  label,
  ajuda,
  ...resto
}: {
  id: string
  name: string
  label: string
  ajuda?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="v-campo" htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={name} {...resto} />
      {ajuda && <span className="v-campo-ajuda">{ajuda}</span>}
    </label>
  )
}

// A password com o botão que a mostra. O botão diz o que vai acontecer
// ("Mostrar"), não o estado actual — é o que se lê melhor num toque.
export function PasswordVitrine({
  id,
  name,
  label = 'Password',
  ajuda,
  autoComplete = 'current-password',
  defaultValue,
}: {
  id: string
  name: string
  label?: string
  ajuda?: string
  autoComplete?: string
  defaultValue?: string
}) {
  const [visivel, setVisivel] = useState(false)

  return (
    <label className="v-campo" htmlFor={id}>
      <span>{label}</span>
      <span className="v-password">
        <input
          id={id}
          name={name}
          type={visivel ? 'text' : 'password'}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          required
        />
        <button type="button" onClick={() => setVisivel((v) => !v)}>
          {visivel ? 'Ocultar' : 'Mostrar'}
        </button>
      </span>
      {ajuda && <span className="v-campo-ajuda">{ajuda}</span>}
    </label>
  )
}

// Uma declaração legal. É um <input type=checkbox> a sério, escondido
// por baixo do quadrado desenhado: o teclado, o leitor de ecrã e o
// "required" do formulário continuam a funcionar sem código nenhum.
export function DeclaracaoVitrine({
  name,
  children,
  onChange,
}: {
  name: string
  children: React.ReactNode
  onChange?: (marcada: boolean) => void
}) {
  const id = useId()
  return (
    <label htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        name={name}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <i aria-hidden="true">✓</i>
      <span>{children}</span>
    </label>
  )
}
