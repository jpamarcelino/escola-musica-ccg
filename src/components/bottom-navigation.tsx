'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  CalendarDays,
  Plus,
  Wallet,
  User,
  Bell,
  GraduationCap,
  Users,
  type LucideIcon,
} from 'lucide-react'

// Navegação inferior (DESIGN_SYSTEM_V2.md secção 11) — cápsula preta
// flutuante, separada das bordas do ecrã, com o item central destacado
// (fundo branco, maior) para a ação mais frequente daquele perfil.
//
// Os ícones são referidos por nome (string) e resolvidos aqui dentro:
// um Server Component não pode passar componentes/funções como prop a
// um Client Component.
const ICONES: Record<string, LucideIcon> = {
  inicio: Home,
  calendario: CalendarDays,
  mais: Plus,
  carteira: Wallet,
  perfil: User,
  notificacoes: Bell,
  alunos: GraduationCap,
  professores: Users,
}

export type ItemNav = {
  href: string
  label: string
  icone: keyof typeof ICONES
  central?: boolean
}

export function BottomNavigation({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-[16px] z-40 flex justify-center px-[16px]"
    >
      <div
        className="flex items-center gap-[4px] rounded-[var(--radius-pill)] px-[10px] py-[10px]"
        style={{ backgroundColor: 'var(--color-ink)', boxShadow: 'var(--shadow-flutuante)' }}
      >
        {itens.map((item) => {
          const Icone = ICONES[item.icone]
          const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`)

          if (item.central) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={ativo ? 'page' : undefined}
                className="mx-[4px] flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white text-[var(--color-ink)] transition-transform motion-safe:active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Icone size={22} strokeWidth={2} aria-hidden="true" />
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={ativo ? 'page' : undefined}
              className="flex h-[44px] w-[52px] flex-col items-center justify-center gap-[2px] rounded-[var(--radius-pill)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ color: ativo ? '#ffffff' : 'rgba(255,255,255,.5)' }}
            >
              <Icone size={20} strokeWidth={ativo ? 2 : 1.5} aria-hidden="true" />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
