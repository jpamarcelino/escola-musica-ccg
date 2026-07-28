'use client'

import { useActionState } from 'react'
import type { AuthState } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/password-input'
import { SubmitButton } from '@/components/submit-button'

type Action = (prevState: AuthState, formData: FormData) => Promise<AuthState>

function Mensagens({ state }: { state: AuthState }) {
  return (
    <>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.info && <p className="text-sm text-green-600">{state.info}</p>}
    </>
  )
}

export function EditarNomeForm({ action, nomeAtual }: { action: Action; nomeAtual: string }) {
  const [state, formAction] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="nome" className="block text-sm font-medium">
        Nome
      </label>
      <div className="flex gap-2">
        <input
          id="nome"
          name="nome"
          defaultValue={nomeAtual}
          required
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
        />
        <SubmitButton
          textoAGuardar="A guardar..."
          className="shrink-0 rounded border border-foreground/20 px-3 py-2 text-sm"
        >
          Guardar
        </SubmitButton>
      </div>
      <Mensagens state={state} />
    </form>
  )
}

export function EditarEmailForm({ action, emailAtual }: { action: Action; emailAtual: string }) {
  const [state, formAction] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="email" className="block text-sm font-medium">
        Email
      </label>
      <div className="flex gap-2">
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={emailAtual}
          required
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
        />
        <SubmitButton
          textoAGuardar="A guardar..."
          className="shrink-0 rounded border border-foreground/20 px-3 py-2 text-sm"
        >
          Guardar
        </SubmitButton>
      </div>
      <Mensagens state={state} />
    </form>
  )
}

export function AlterarPasswordForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="passwordAtual" className="block text-sm font-medium">
          Password atual
        </label>
        <PasswordInput
          name="passwordAtual"
          autoComplete="current-password"
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="passwordNova" className="block text-sm font-medium">
          Nova password
        </label>
        <PasswordInput
          name="passwordNova"
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="passwordNovaRepetir" className="block text-sm font-medium">
          Repetir nova password
        </label>
        <PasswordInput
          name="passwordNovaRepetir"
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
        />
      </div>
      <Mensagens state={state} />
      <SubmitButton
        textoAGuardar="A guardar..."
        className="rounded border border-foreground/20 px-3 py-2 text-sm"
      >
        Alterar password
      </SubmitButton>
    </form>
  )
}
