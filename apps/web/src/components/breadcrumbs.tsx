import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

// Fio de Ariana para rotas com 3+ níveis (ex: /admin/pagamentos/historico/[id]),
// onde o BackButton só devolve um nível e a orientação fica só na memória de
// curto prazo. O último item é a página atual — nunca é link.
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Navegação estrutural" className="flex flex-wrap items-center gap-[4px] text-[12.5px]">
      {items.map((item, i) => {
        const ultimo = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-[4px]">
            {i > 0 && (
              <ChevronRight
                size={12}
                strokeWidth={1.5}
                aria-hidden="true"
                style={{ color: 'var(--color-tinta-suave)' }}
              />
            )}
            {item.href && !ultimo ? (
              <Link
                href={item.href}
                className="hover:underline [text-underline-offset:3px]"
                style={{ color: 'var(--color-tinta-suave)' }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={ultimo ? 'page' : undefined}
                style={{ color: ultimo ? 'var(--color-tinta)' : 'var(--color-tinta-suave)' }}
              >
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
