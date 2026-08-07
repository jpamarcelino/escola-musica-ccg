'use client'

import { useState } from 'react'
import { Metronomo } from '@/components/metronomo'

type Separador = 'metronomo'

// Separadores dentro de "Materiais das Aulas". Por agora só há o Metrónomo
// (só para alunos de música) — a estrutura fica pronta para mais separadores
// no futuro (ex: partituras).
export function MateriaisClient({ temMusica }: { temMusica: boolean }) {
  const separadores: { id: Separador; nome: string }[] = temMusica
    ? [{ id: 'metronomo', nome: 'Metrónomo' }]
    : []

  const [ativo, setAtivo] = useState<Separador | null>(separadores[0]?.id ?? null)

  if (separadores.length === 0) {
    return <p className="text-sm text-foreground/60">Em breve.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-foreground/10">
        {separadores.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setAtivo(s.id)}
            className={
              ativo === s.id
                ? 'px-3 py-2 text-sm font-medium border-b-2 border-brand text-brand'
                : 'px-3 py-2 text-sm font-medium border-b-2 border-transparent text-foreground/60'
            }
          >
            {s.nome}
          </button>
        ))}
      </div>

      {ativo === 'metronomo' && <Metronomo />}
    </div>
  )
}
