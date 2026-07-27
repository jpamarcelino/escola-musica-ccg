import Link from 'next/link'

export function InstalarCallout() {
  return (
    <div className="callout-instalar-wrap">
      <svg
        className="callout-seta"
        viewBox="0 0 60 60"
        width="44"
        height="44"
        aria-hidden="true"
      >
        <path
          d="M6 8 C 6 34, 24 44, 44 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M34 36 L45 41 L41 29"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <Link href="/instalar" className="callout-instalar">
        <span className="callout-instalar-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M11 18h2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="callout-instalar-texto">
          <strong>Instala a app no telemóvel</strong>
          <span>Acesso mais rápido, como uma app normal — vê como</span>
        </span>
      </Link>
    </div>
  )
}
