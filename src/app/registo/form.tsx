'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/lib/actions/auth'

export default function RegistoForm() {
  const [state, action, pending] = useActionState(signup, undefined)
  const searchParams = useSearchParams()
  const programaLink = searchParams.get('programa')

  const [tipo, setTipo] = useState<'aluno' | 'professor' | 'admin'>('aluno')
  const [programa, setPrograma] = useState<'musica' | 'danca' | ''>(
    programaLink === 'musica' || programaLink === 'danca' ? programaLink : ''
  )

  // Impede escolher uma data futura no próprio seletor do browser.
  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <form
      action={action}
      className="w-full max-w-sm space-y-4 border border-foreground/15 rounded-lg p-6"
    >
      <h1 className="text-xl font-semibold">Criar conta</h1>

      <div className="space-y-1">
        <span className="block text-sm font-medium">Eu sou...</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="aluno"
              checked={tipo === 'aluno'}
              onChange={() => setTipo('aluno')}
              required
            />
            Aluno
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="professor"
              checked={tipo === 'professor'}
              onChange={() => setTipo('professor')}
              required
            />
            Professor
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="tipo"
              value="admin"
              checked={tipo === 'admin'}
              onChange={() => setTipo('admin')}
              required
            />
            Admin
          </label>
        </div>
      </div>

      {tipo === 'professor' && (
        <>
          <div className="space-y-1">
            <span className="block text-sm font-medium">Escola</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="programa"
                  value="musica"
                  checked={programa === 'musica'}
                  onChange={() => setPrograma('musica')}
                  required
                />
                Música
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="programa"
                  value="danca"
                  checked={programa === 'danca'}
                  onChange={() => setPrograma('danca')}
                  required
                />
                Dança
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="codigoProfessor" className="block text-sm font-medium">
              Código de professor
            </label>
            <input
              id="codigoProfessor"
              name="codigoProfessor"
              required
              className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
            />
            <p className="text-xs text-foreground/50">
              Pede este código à direção da escola.
            </p>
          </div>
        </>
      )}

      {tipo === 'admin' && (
        <div className="space-y-1">
          <label htmlFor="codigoAdmin" className="block text-sm font-medium">
            Código de admin
          </label>
          <input
            id="codigoAdmin"
            name="codigoAdmin"
            required
            className="w-full rounded border border-foreground/20 bg-background px-3 py-2"
          />
          <p className="text-xs text-foreground/50">
            Pede este código à direção da escola.
          </p>
        </div>
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

      {tipo === 'aluno' && (
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
          <p className="text-xs text-foreground/50">
            Serve para sabermos em que turmas podes entrar.
          </p>
        </div>
      )}

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
          minLength={6}
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
