import Link from 'next/link'

export function OptionCard({
  href,
  nome,
  imagemUrl,
  subtitulo,
  wide = false,
  icone = false,
  iconePadding,
}: {
  href: string
  nome: string
  imagemUrl?: string | null
  subtitulo?: string | null
  wide?: boolean
  icone?: boolean
  iconePadding?: string
}) {
  return (
    <Link href={href} className={wide ? 'option-card wide' : 'option-card'}>
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
      <span className="option-card-label">
        <span className="option-card-name">{nome}</span>
        {subtitulo && <span className="option-card-sub">{subtitulo}</span>}
      </span>
    </Link>
  )
}
