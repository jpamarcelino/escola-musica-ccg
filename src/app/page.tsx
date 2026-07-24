import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OptionCard } from '@/components/option-card'

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

      <div className="option-grid w-full max-w-xs">
        <OptionCard href="/registo?programa=musica" nome="Escola de Música" />
        <OptionCard href="/registo?programa=danca" nome="Escola de Dança" />
      </div>

      <Link href="/login" className="rounded border border-foreground/20 px-4 py-2">
        Já tens conta? Entrar
      </Link>
    </main>
  )
}
