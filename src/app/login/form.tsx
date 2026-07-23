'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/lib/actions/auth'

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  const searchParams = useSearchParams()
  const erroLink = searchParams.get('erro')

  return (
    <form
      action={action}
      className="w-full max-w-sm space-y-4 border border-foreground/15 rounded-lg p-6"
    >
      <h1 className="text-xl font-semibold">Entrar</h1>

      {erroLink && <p className="text-sm text-red-600">{erroLink}</p>}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2 disabled:opacity-50"
      >
        {pending ? 'A entrar...' : 'Entrar'}
      </button>

      <p className="text-sm text-center">
        <Link href="/esqueci-password" className="underline">
          Esqueceste-te da password?
        </Link>
      </p>

      <p className="text-sm text-center">
        Ainda não tens conta?{' '}
        <Link href="/registo" className="underline">
          Criar conta
        </Link>
      </p>
    </form>
  )
}
