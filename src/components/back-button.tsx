import Link from 'next/link'

export function BackButton({ href }: { href: string }) {
  return (
    <Link href={href} className="back-button" aria-label="Voltar">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M15 5 L8 12 L15 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  )
}
