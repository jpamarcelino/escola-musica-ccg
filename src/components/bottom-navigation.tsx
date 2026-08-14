'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  CalendarDays,
  Wallet,
  User,
  Bell,
  GraduationCap,
  Users,
  ClipboardCheck,
  Inbox,
  Menu,
  type LucideIcon,
} from 'lucide-react'

// Navegação inferior explícita: os destinos têm ícone e texto visível.
// A versão anterior usava um "+" com três significados diferentes conforme
// o perfil, obrigando a aprender a interface por tentativa e erro.
//
// Os ícones são referidos por nome (string) e resolvidos aqui dentro:
// um Server Component não pode passar componentes/funções como prop a
// um Client Component.
const ICONES: Record<string, LucideIcon> = {
  inicio: Home,
  calendario: CalendarDays,
  carteira: Wallet,
  perfil: User,
  notificacoes: Bell,
  alunos: GraduationCap,
  professores: Users,
  presencas: ClipboardCheck,
  pedidos: Inbox,
  mais: Menu,
}

export type ItemNav = {
  href: string
  label: string
  icone: keyof typeof ICONES
  correspondencia?: 'exata' | 'prefixo'
}

export function BottomNavigation({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 z-40 flex justify-center px-[12px]"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="flex w-full max-w-[430px] items-stretch gap-[2px] rounded-[var(--radius-pill)] px-[8px] py-[8px]"
        style={{ backgroundColor: 'var(--color-ink)', boxShadow: 'var(--shadow-flutuante)' }}
      >
        {itens.map((item) => {
          const Icone = ICONES[item.icone]
          const correspondencia = item.correspondencia ?? 'prefixo'
          const ativo =
            pathname === item.href ||
            (correspondencia === 'prefixo' && pathname.startsWith(`${item.href}/`))

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? 'page' : undefined}
              className="flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-[var(--radius-pill)] px-[2px] transition-[color,background-color] motion-safe:active:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{
                color: ativo ? '#ffffff' : 'rgba(255,255,255,.68)',
                backgroundColor: ativo ? 'rgba(255,255,255,.12)' : 'transparent',
              }}
            >
              <Icone size={20} strokeWidth={ativo ? 2 : 1.5} aria-hidden="true" />
              <span className="max-w-full truncate text-[12px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
