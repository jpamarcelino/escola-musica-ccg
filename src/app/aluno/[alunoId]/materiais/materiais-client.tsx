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
    <div className="materiais-conteudo">
      <div className="materiais-separadores">
        {separadores.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setAtivo(s.id)}
            className="materiais-separador"
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
