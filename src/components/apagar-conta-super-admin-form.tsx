'use client'

import { useActionState } from 'react'
import type { AuthState } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/password-input'
import { SubmitButton } from '@/components/submit-button'

type Action = (prevState: AuthState, formData: FormData) => Promise<AuthState>

export function ApagarContaSuperAdminForm({
  action,
  outrosAdmins,
}: {
  action: Action
  outrosAdmins: { id: string; nome: string }[]
}) {
  const [state, formAction] = useActionState(action, undefined)

  if (outrosAdmins.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-red-600">Apagar conta</p>
        <p className="text-sm text-foreground/60">
          És o único administrador — não há para quem passar o super admin. Cria outra conta
          admin antes de poderes apagar a tua.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm font-semibold text-red-600">Apagar conta</p>
      <p className="text-xs text-foreground/50">
        És super admin — antes de apagares a conta, escolhe quem fica com esse papel e confirma
        com a tua password.
      </p>

      <div className="space-y-1">
        <label htmlFor="novoSuperAdminId" className="block text-sm font-medium">
          Novo super admin
        </label>
        <select
          id="novoSuperAdminId"
          name="novoSuperAdminId"
          required
          defaultValue=""
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Escolhe um administrador
          </option>
          {outrosAdmins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          A tua password
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton
        textoAGuardar="A apagar conta..."
        className="w-full rounded border border-red-600/40 py-2 text-sm text-red-600 hover:bg-red-600/5"
        onClick={(e) => {
          if (
            !window.confirm(
              'Tens a certeza que queres apagar a tua conta de super admin? Esta ação é irreversível.'
            )
          ) {
            e.preventDefault()
          }
        }}
      >
        Apagar conta
      </SubmitButton>
    </form>
  )
}
