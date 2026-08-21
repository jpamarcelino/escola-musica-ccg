'use client'

import { useState } from 'react'
import { EnviarVideoForm } from './enviar-video-form'
import { EnviarPartituraForm } from './enviar-partitura-form'
import type { AlunoEscolhivel } from '@/components/seletor-alunos'

// Os mesmos dois nomes que o aluno vê no caderno. Se aqui se chamasse
// "Ficheiros" e lá "Partituras", o professor tinha de adivinhar onde é que
// o que enviou foi parar.
export function EscolhaMaterial({
  alunos,
  alunoInicial,
}: {
  alunos: AlunoEscolhivel[]
  alunoInicial?: string
}) {
  const [tipo, setTipo] = useState<'video' | 'partitura'>('video')

  return (
    <div className="materiais-conteudo">
      <div className="materiais-separadores" role="tablist" aria-label="Tipo de material">
        {([
          ['video', 'Vídeo'],
          ['partitura', 'Partitura'],
        ] as const).map(([id, nome]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tipo === id}
            onClick={() => setTipo(id)}
            className="materiais-separador"
            style={
              tipo === id
                ? { borderColor: 'var(--color-azul-fundo)', color: 'var(--color-azul-fundo)' }
                : { borderColor: 'transparent', color: 'var(--color-tinta-suave)' }
            }
          >
            {nome}
          </button>
        ))}
      </div>

      <div key={tipo} className="motion-content-swap">
        {tipo === 'video' ? (
          <EnviarVideoForm alunos={alunos} alunoInicial={alunoInicial} />
        ) : (
          <EnviarPartituraForm alunos={alunos} alunoInicial={alunoInicial} />
        )}
      </div>
    </div>
  )
}
