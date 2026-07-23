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
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-semibold">Escola de Música</h1>
      <p className="max-w-sm text-foreground/60">
        Marca as tuas aulas de forma simples: escolhe o instrumento, o
        professor e os horários que preferes.
      </p>
      <div className="flex gap-3">
        <Link href="/registo" className="rounded bg-black text-white px-4 py-2">
          Criar conta
        </Link>
        <Link
          href="/login"
          className="rounded border border-foreground/20 px-4 py-2"
        >
          Entrar
        </Link>
      </div>
    </main>
  )
}
