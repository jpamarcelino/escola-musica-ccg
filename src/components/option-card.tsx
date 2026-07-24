import Link from 'next/link'
import type { CSSProperties } from 'react'

export function OptionCard({
  href,
  nome,
  imagemUrl,
  subtitulo,
  wide = false,
  icone = false,
  iconePadding,
  index = 0,
  tituloNegrito = false,
}: {
  href: string
  nome: string
  imagemUrl?: string | null
  subtitulo?: string | null
  wide?: boolean
  icone?: boolean
  iconePadding?: string
  index?: number
  tituloNegrito?: boolean
}) {
  return (
    <Link
      href={href}
      className={wide ? 'option-card wide' : 'option-card'}
      style={{ '--card-index': index } as CSSProperties}
    >
      {!wide && (
        <span className={icone ? 'option-card-media icon' : 'option-card-media'}>
          {imagemUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagemUrl}
              alt=""
              style={icone && iconePadding ? { padding: iconePadding } : undefined}
            />
          ) : (
            <span className="option-card-initial" aria-hidden="true">
              {nome.slice(0, 1)}
            </span>
          )}
        </span>
      )}
      <span className={tituloNegrito ? 'option-card-label tall' : 'option-card-label'}>
        <span className={tituloNegrito ? 'option-card-name negrito' : 'option-card-name'}>
          {nome}
        </span>
        {subtitulo && <span className="option-card-sub">{subtitulo}</span>}
      </span>
    </Link>
  )
}
