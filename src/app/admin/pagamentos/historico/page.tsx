import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { PagamentosTabs } from '@/components/pagamentos-tabs'

type Professor = {
  id: string
  nome: string
  programa: string | null
}

export default async function HistoricoPagamentosPage() {
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
      <div className="w-full max-w-3xl space-y-8 text-left">
        <div
          className="entrada-esquerda flex items-center gap-3"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <BackButton href="/admin" />
          <h1 className="text-2xl font-semibold text-foreground">Mensalidades</h1>
        </div>

        <PagamentosTabs ativo="historico" />

        {professores.length === 0 ? (
          <p className="text-sm text-foreground/60">Ainda não há professores registados.</p>
        ) : (
          professores.map((professor, idx) => (
            <section
              key={professor.id}
              className="entrada-esquerda space-y-3"
              style={{ '--card-index': idx + 1 } as CSSProperties}
            >
              <h2 className="secao-titulo">
                {professor.nome}{' '}
                <span className="font-sans text-xs font-normal text-foreground/50">
                  (
                  {professor.programa === 'musica'
                    ? 'Música'
                    : professor.programa === 'danca'
                      ? 'Dança'
                      : 'sem escola'}
                  )
                </span>
              </h2>
              <div className="lista-item">
                <p className="lista-item-sub">Em breve.</p>
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  )
}
