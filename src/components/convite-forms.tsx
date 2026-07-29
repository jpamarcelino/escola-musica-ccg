'use client'

import { useActionState, useState } from 'react'
import type { ConviteState } from '@/lib/actions/convites'
import { SubmitButton } from '@/components/submit-button'

type Action = (prevState: ConviteState, formData: FormData) => Promise<ConviteState>

function LinkGerado({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false)

  return (
    <div className="space-y-2 rounded border border-foreground/15 bg-foreground/5 p-3">
      <p className="text-sm font-medium">Link de convite (uso único):</p>
      <p className="break-all text-xs text-foreground/70">{link}</p>
      <button
        type="button"
        className="rounded border border-foreground/20 px-3 py-1 text-sm"
        onClick={async () => {
          await navigator.clipboard.writeText(link)
          setCopiado(true)
          setTimeout(() => setCopiado(false), 2000)
        }}
      >
        {copiado ? 'Copiado!' : 'Copiar link'}
      </button>
    </div>
  )
}

export function ConvidarProfessorForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="programa" className="block text-sm font-medium">
            Escola
          </label>
          <select
            id="programa"
            name="programa"
            required
            defaultValue=""
            className="rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Escolhe
            </option>
            <option value="musica">Música</option>
            <option value="danca">Dança</option>
          </select>
        </div>
        <SubmitButton
          textoAGuardar="A gerar..."
          className="rounded border border-foreground/20 px-3 py-2 text-sm"
        >
          Convidar professor
        </SubmitButton>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.link && <LinkGerado link={state.link} />}
    </form>
  )
}

export function ConvidarAdminForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-3">
      <SubmitButton
        textoAGuardar="A gerar..."
        className="rounded border border-foreground/20 px-3 py-2 text-sm"
      >
        Convidar administrador
      </SubmitButton>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.link && <LinkGerado link={state.link} />}
    </form>
  )
}

export function GerarLinkMigracaoForm({ action, alunoId }: { action: Action; alunoId: string }) {
  const [state, formAction] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="alunoId" value={alunoId} />
      <SubmitButton
        textoAGuardar="A gerar..."
        className="rounded border border-foreground/20 px-3 py-1 text-xs"
      >
        Gerar link para este aluno gerir a própria conta
      </SubmitButton>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.link && <LinkGerado link={state.link} />}
    </form>
  )
}

export function ResgatarConviteForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="codigo" className="block text-sm font-medium">
        Tens um código de convite?
      </label>
      <div className="flex gap-2">
        <input
          id="codigo"
          name="codigo"
          placeholder="Código"
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
        />
        <SubmitButton
          textoAGuardar="A validar..."
          className="shrink-0 rounded border border-foreground/20 px-3 py-2 text-sm"
        >
          Resgatar
        </SubmitButton>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.info && <p className="text-sm text-green-600">{state.info}</p>}
    </form>
  )
}
