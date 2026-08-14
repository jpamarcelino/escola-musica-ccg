import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export function BackButton({ href }: { href: string }) {
  return (
    <Link href={href} className="back-button" aria-label="Voltar">
      <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
    </Link>
  )
}
