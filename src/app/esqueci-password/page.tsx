'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { pedirRecuperacaoPassword } from '@/lib/actions/auth'

export default function EsqueciPasswordPage() {
  const [state, action, pending] = useActionState(
    pedirRecuperacaoPassword,
    undefined
  )

  return (
    <main id="conteudo-principal" className="flex-1 flex items-center justify-center p-6">
      <form
        action={action}
        className="w-full max-w-sm space-y-4 border border-foreground/15 rounded-lg p-6"
      >
        <h1 className="text-xl font-semibold">Recuperar password</h1>
        <p className="text-sm text-foreground/60">
          Introduz o teu email e enviamos-te um link para definires uma nova
          password.
        </p>

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

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.info && <p className="text-sm text-green-600">{state.info}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2 disabled:opacity-50"
        >
          {pending ? 'A enviar...' : 'Enviar link'}
        </button>

        <p className="text-sm text-center">
          <Link href="/login" className="underline">
            Voltar a entrar
          </Link>
        </p>
      </form>
    </main>
  )
}
