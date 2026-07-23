import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Centro Cultural</h1>
        <p className="max-w-sm text-foreground/60">
          Marca as tuas aulas de forma simples: escolhe a escola, a disciplina,
          o professor e os horários que preferes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex w-64 flex-col gap-3 rounded-lg border border-foreground/15 p-6">
          <h2 className="font-semibold">Escola de Música</h2>
          <Link
            href="/registo?programa=musica"
            className="rounded bg-brand text-white hover:bg-brand-hover px-4 py-2"
          >
            Criar conta
          </Link>
        </div>
        <div className="flex w-64 flex-col gap-3 rounded-lg border border-foreground/15 p-6">
          <h2 className="font-semibold">Escola de Dança</h2>
          <Link
            href="/registo?programa=danca"
            className="rounded bg-brand text-white hover:bg-brand-hover px-4 py-2"
          >
            Criar conta
          </Link>
        </div>
      </div>

      <Link href="/login" className="rounded border border-foreground/20 px-4 py-2">
        Já tens conta? Entrar
      </Link>
    </main>
  )
}
