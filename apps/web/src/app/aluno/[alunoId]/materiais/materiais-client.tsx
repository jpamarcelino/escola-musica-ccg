'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, FileText, Download } from 'lucide-react'
import { miniaturaYoutube, urlDoVideoYoutube, formatarDataEscolar } from '@ccg/core'
import { Metronomo } from '@/components/metronomo'
import { Afinador } from '@/components/afinador'
import { EmptyState } from '@/components/empty-state'

export type PartituraDoAluno = {
  id: number
  titulo: string
  descricao: string | null
  ficheiro_nome: string | null
  ficheiro_bytes: number | null
  criado_em: string
  professor: { nome: string } | null
  // Link assinado, gerado no servidor a cada visita: o bucket é privado e
  // o endereço direto não abre.
  url: string | null
}

export type VideoDoAluno = {
  id: number
  youtube_id: string
  titulo: string
  descricao: string | null
  criado_em: string
  professor: { nome: string } | null
}

type Separador = 'videos' | 'partituras' | 'metronomo' | 'afinador'

// Separadores dentro do caderno do aluno.
//
// Vídeos e Partituras já cá estão, e já se abrem, mas ainda não têm nada
// dentro: são o sítio onde o professor vai poder deixar material. Estarem
// visíveis desde já é intencional — quem abre o caderno percebe o que a
// escola tenciona pôr lá, em vez de encontrar um metrónomo solitário e
// concluir que é só isso.
function tamanhoLegivel(bytes: number | null): string | null {
  if (!bytes) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export function MateriaisClient({
  temMusica,
  videos,
  partituras,
}: {
  temMusica: boolean
  videos: VideoDoAluno[]
  partituras: PartituraDoAluno[]
}) {
  // O metrónomo continua a ser só para música: a dança e a "Música para
  // bebés" não o usam, e um separador que não serve para nada é pior do
  // que separador nenhum. Os outros dois servem a qualquer disciplina.
  const separadores: { id: Separador; nome: string }[] = [
    { id: 'videos', nome: 'Vídeos' },
    { id: 'partituras', nome: 'Partituras' },
    // O metrónomo e o afinador andam juntos e pela mesma razão: são
    // ferramentas de música. Numa aula de dança ou na "Música para
    // bebés" não servem para nada, e um separador que não serve para
    // nada é pior do que separador nenhum.
    ...(temMusica
      ? [
          { id: 'metronomo' as const, nome: 'Metrónomo' },
          { id: 'afinador' as const, nome: 'Afinador' },
        ]
      : []),
  ]

  const [ativo, setAtivo] = useState<Separador>(separadores[0].id)

  return (
    <div className="materiais-conteudo">
      <div className="materiais-separadores" role="tablist" aria-label="Materiais das aulas">
        {separadores.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`separador-${s.id}`}
            aria-selected={ativo === s.id}
            aria-controls={`painel-${s.id}`}
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

      <div
        key={ativo}
        className="motion-content-swap"
        role="tabpanel"
        id={`painel-${ativo}`}
        aria-labelledby={`separador-${ativo}`}
      >
        {ativo === 'videos' &&
          (videos.length === 0 ? (
            <EmptyState
              titulo="Ainda não há vídeos"
              descricao="É aqui que vão ficar os vídeos que o professor deixar — exercícios, exemplos, gravações da aula."
            />
          ) : (
            <ul className="material-videos">
              {videos.map((v) => (
                <li key={v.id}>
                  {/* Abre no YouTube, fora da app: no telemóvel a app
                      nativa dá ecrã inteiro, velocidade e legendas, que
                      um player embebido pequeno não dá. */}
                  <a
                    href={urlDoVideoYoutube(v.youtube_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="material-video-imagem">
                      <Image
                        src={miniaturaYoutube(v.youtube_id)}
                        alt=""
                        width={480}
                        height={360}
                        unoptimized
                      />
                      <span className="material-video-play" aria-hidden="true">
                        <Play size={18} fill="currentColor" strokeWidth={0} />
                      </span>
                    </span>
                    <span className="material-video-texto">
                      <strong>{v.titulo}</strong>
                      {v.descricao && <span>{v.descricao}</span>}
                      <small>
                        {v.professor?.nome ?? 'O teu professor'} ·{' '}
                        {formatarDataEscolar(v.criado_em.slice(0, 10), {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </small>
                    </span>
                    <span className="sr-only">(abre no YouTube)</span>
                  </a>
                </li>
              ))}
            </ul>
          ))}
        {ativo === 'partituras' &&
          (partituras.length === 0 ? (
            <EmptyState
              titulo="Ainda não há partituras"
              descricao="É aqui que vão ficar as partituras e os trabalhos de casa do professor."
            />
          ) : (
            <ul className="material-partituras">
              {partituras.map((p) => (
                <li key={p.id}>
                  <a href={p.url ?? '#'} target="_blank" rel="noopener noreferrer">
                    <span className="material-pdf-icone" aria-hidden="true">
                      <FileText size={22} strokeWidth={1.5} />
                    </span>
                    <span className="material-video-texto">
                      <strong>{p.titulo}</strong>
                      {p.descricao && <span>{p.descricao}</span>}
                      <small>
                        {p.professor?.nome ?? 'O teu professor'} ·{' '}
                        {formatarDataEscolar(p.criado_em.slice(0, 10), {
                          day: 'numeric',
                          month: 'long',
                        })}
                        {tamanhoLegivel(p.ficheiro_bytes)
                          ? ` · ${tamanhoLegivel(p.ficheiro_bytes)}`
                          : ''}
                      </small>
                    </span>
                    <span className="material-pdf-abrir" aria-hidden="true">
                      <Download size={18} strokeWidth={1.5} />
                    </span>
                    <span className="sr-only">(abre o PDF)</span>
                  </a>
                </li>
              ))}
            </ul>
          ))}
        {ativo === 'metronomo' && <Metronomo />}
        {/* Montado só quando o separador está ativo: mudar de separador
            desmonta-o, e é a desmontagem que larga o microfone. */}
        {ativo === 'afinador' && <Afinador />}
      </div>
    </div>
  )
}
