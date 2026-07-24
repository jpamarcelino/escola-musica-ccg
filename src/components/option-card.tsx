import Link from 'next/link'

export function OptionCard({
  href,
  nome,
  imagemUrl,
  subtitulo,
}: {
  href: string
  nome: string
  imagemUrl?: string | null
  subtitulo?: string | null
}) {
  return (
    <Link href={href} className="option-card">
      <span className="option-card-media">
        {imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagemUrl} alt="" />
        ) : (
          <span className="option-card-initial" aria-hidden="true">
            {nome.slice(0, 1)}
          </span>
        )}
      </span>
      <span className="option-card-label">
        <span className="option-card-name">{nome}</span>
        {subtitulo && <span className="option-card-sub">{subtitulo}</span>}
      </span>
    </Link>
  )
}
