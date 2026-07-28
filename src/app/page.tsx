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
        <h1 className="text-2xl font-semibold">Centro Cultural da Guarda</h1>
        <p className="max-w-sm text-foreground/60">
          Marca as tuas aulas de forma simples: escolhe a escola, a disciplina,
          o professor e os horários que preferes.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Link
          href="/registo"
          className="block w-full rounded bg-brand text-white hover:bg-brand-hover py-2"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="block w-full rounded border border-foreground/20 px-4 py-2"
        >
          Já tens conta? Entrar
        </Link>
      </div>
    </main>
  )
}
