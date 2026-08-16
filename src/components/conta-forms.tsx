'use client'

import { useActionState } from 'react'
import type { AuthState } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/password-input'
import { SubmitButton } from '@/components/submit-button'
import { Rotulo, classesCampo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'

type Action = (prevState: AuthState, formData: FormData) => Promise<AuthState>

// Botão "Guardar" inline, ao lado do campo — a mesma linguagem visual do
// BotaoSecundario (borda 1.5px azul-fundo), mas largura automática e 44px
// de altura (mínimo de alvo de toque da secção 9), porque aqui vive dentro
// de uma linha com o input em vez de ocupar o ecrã todo.
const CLASSES_GUARDAR =
  'inline-flex h-[44px] shrink-0 items-center justify-center rounded-[13px] border-[1.5px] border-[var(--color-azul-fundo)] px-4 text-[14px] font-semibold text-[var(--color-azul-fundo)] transition-colors disabled:opacity-50'

function Mensagens({ state }: { state: AuthState }) {
  return (
    <>
      {state?.error && <MensagemErro>{state.error}</MensagemErro>}
      {state?.info && <MensagemInfo>{state.info}</MensagemInfo>}
    </>
  )
}

export function EditarNomeForm({ action, nomeAtual }: { action: Action; nomeAtual: string }) {
  const [state, formAction] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-[6px]">
      <Rotulo htmlFor="nome">Nome</Rotulo>
      <div className="flex gap-[8px]">
        <input
          id="nome"
          name="nome"
          defaultValue={nomeAtual}
          required
          className={classesCampo}
        />
        <SubmitButton textoAGuardar="A guardar…" className={CLASSES_GUARDAR}>
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
    <form action={formAction} className="space-y-[6px]">
      <Rotulo htmlFor="email">Email</Rotulo>
      <div className="flex gap-[8px]">
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={emailAtual}
          required
          className={classesCampo}
        />
        <SubmitButton textoAGuardar="A guardar…" className={CLASSES_GUARDAR}>
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
    <form action={formAction} className="space-y-[14px]">
      <div className="space-y-[6px]">
        <Rotulo htmlFor="passwordAtual">Password atual</Rotulo>
        <PasswordInput
          id="passwordAtual"
          name="passwordAtual"
          autoComplete="current-password"
          className={classesCampo}
        />
      </div>
      <div className="space-y-[6px]">
        <Rotulo htmlFor="passwordNova">Nova password</Rotulo>
        <PasswordInput
          id="passwordNova"
          name="passwordNova"
          minLength={6}
          autoComplete="new-password"
          className={classesCampo}
        />
      </div>
      <div className="space-y-[6px]">
        <Rotulo htmlFor="passwordNovaRepetir">Repetir nova password</Rotulo>
        <PasswordInput
          id="passwordNovaRepetir"
          name="passwordNovaRepetir"
          minLength={6}
          autoComplete="new-password"
          className={classesCampo}
        />
      </div>
      <Mensagens state={state} />
      <SubmitButton textoAGuardar="A guardar…" className={CLASSES_GUARDAR}>
        Alterar password
      </SubmitButton>
    </form>
  )
}
