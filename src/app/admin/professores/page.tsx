import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'

type Professor = {
  id: string
  nome: string
  programa: string | null
}

export default async function AdminProfessoresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: professoresData } = await supabase
    .from('profiles')
    .select('id, nome, programa')
    .eq('tipo', 'professor')
    .order('nome')
  const professores = (professoresData ?? []) as Professor[]

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div
          className="entrada-esquerda flex items-center gap-3"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <BackButton href="/admin" />
          <h1 className="text-2xl font-semibold text-foreground">Professores</h1>
        </div>

        {professores.length === 0 ? (
          <p className="text-sm text-foreground/60">Ainda não há professores registados.</p>
        ) : (
          <div className="space-y-2">
            {professores.map((professor) => (
              <Link
                key={professor.id}
                href={`/admin/professores/${professor.id}`}
                className="lista-item block"
              >
                <p className="lista-item-titulo">{professor.nome}</p>
                <p className="lista-item-sub">
                  {professor.programa === 'musica'
                    ? 'Música'
                    : professor.programa === 'danca'
                      ? 'Dança'
                      : 'sem escola'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
