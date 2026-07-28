'use client'

import { useActionState } from 'react'
import { atualizarPassword } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/password-input'

export default function RedefinirPasswordForm() {
  const [state, action, pending] = useActionState(atualizarPassword, undefined)

  return (
    <form
      action={action}
      className="w-full max-w-sm space-y-4 border border-foreground/15 rounded-lg p-6"
    >
      <h1 className="text-xl font-semibold">Definir nova password</h1>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          Nova password
        </label>
        <PasswordInput
          id="password"
          name="password"
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2 disabled:opacity-50"
      >
        {pending ? 'A guardar...' : 'Guardar password'}
      </button>
    </form>
  )
}
