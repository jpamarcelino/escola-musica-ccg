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
    return (
      <p className="text-[13px]" style={{ color: 'var(--color-tinta-suave)' }}>
        Em breve.
      </p>
    )
  }

  return (
    <div className="space-y-[22px]">
      <div className="flex gap-[8px] border-b" style={{ borderColor: 'var(--color-linha)' }}>
        {separadores.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setAtivo(s.id)}
            className="px-[12px] py-[10px] text-[14px] font-semibold border-b-2 transition-colors"
            style={
              ativo === s.id
                ? { borderColor: 'var(--color-azul-fundo)', color: 'var(--color-azul-fundo)' }
                : { borderColor: 'transparent', color: 'var(--color-tinta-suave)' }
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
