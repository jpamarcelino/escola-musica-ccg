'use client'

import { useState } from 'react'
import { EnviarVideoForm } from './enviar-video-form'
import { EnviarPartituraForm } from './enviar-partitura-form'
import type { AlunoEscolhivel } from '@/components/seletor-alunos'
import { FileText, Video } from 'lucide-react'

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
          >
            {id === 'video' ? <Video size={17} aria-hidden="true" /> : <FileText size={17} aria-hidden="true" />}
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
