'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/password-input'

type ConviteInfo = {
  tipo: string
  programa: string | null
  aluno_nome: string | null
  valido: boolean
} | null

const PROGRAMA_LABEL: Record<string, string> = {
  musica: 'Música',
  danca: 'Dança',
}

export default function RegistoForm({
  conviteCodigo,
  conviteInfo,
}: {
  conviteCodigo: string | null
  conviteInfo: ConviteInfo
}) {
  const [state, action, pending] = useActionState(signup, undefined)

  // Impede escolher uma data futura no próprio seletor do browser.
  const hoje = new Date().toISOString().slice(0, 10)

  const conviteInvalido = conviteCodigo && (!conviteInfo || !conviteInfo.valido)

  return (
    <form
      action={action}
      className="w-full max-w-sm space-y-4 border border-foreground/15 rounded-lg p-6"
    >
      <h1 className="text-xl font-semibold">Criar Conta CCG</h1>

      {conviteCodigo && (
        <input type="hidden" name="conviteCodigo" value={conviteCodigo} />
      )}

      {conviteInvalido && (
        <p className="text-sm text-red-600">
          Este link de convite é inválido ou já foi utilizado. Podes na mesma criar uma conta
          normal abaixo.
        </p>
      )}

      {conviteInfo?.valido && conviteInfo.tipo === 'professor' && (
        <p className="text-sm rounded bg-foreground/5 p-2">
          Este link cria uma conta de <strong>professor</strong>
          {conviteInfo.programa && ` — Escola de ${PROGRAMA_LABEL[conviteInfo.programa]}`}.
        </p>
      )}
      {conviteInfo?.valido && conviteInfo.tipo === 'admin' && (
        <p className="text-sm rounded bg-foreground/5 p-2">
          Este link cria uma conta de <strong>administrador</strong>.
        </p>
      )}
      {conviteInfo?.valido && conviteInfo.tipo === 'migracao_aluno' && (
        <p className="text-sm rounded bg-foreground/5 p-2">
          Ao criares a tua conta, o perfil de aluno de{' '}
          <strong>{conviteInfo.aluno_nome}</strong> passa a ficar ligado a ela.
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="nome" className="block text-sm font-medium">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="telefone" className="block text-sm font-medium">
          Número de telemóvel
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          autoComplete="tel"
          required
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="dataNascimento" className="block text-sm font-medium">
          Data de nascimento
        </label>
        <input
          id="dataNascimento"
          name="dataNascimento"
          type="date"
          required
          max={hoje}
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
        />
      </div>

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
        <PasswordInput
          id="password"
          name="password"
          minLength={6}
          autoComplete="new-password"
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
        {pending ? 'A criar conta...' : 'Criar conta'}
      </button>

      <p className="text-sm text-center">
        Já tens conta?{' '}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
    </form>
  )
}
