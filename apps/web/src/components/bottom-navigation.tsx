'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SimboloCCG } from '@/components/simbolo-ccg'
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
  BookOpen,
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
  materiais: BookOpen,
  mais: Menu,
}

export type ItemNav = {
  href: string
  label: string
  icone: keyof typeof ICONES
  correspondencia?: 'exata' | 'prefixo'
  // Quantas coisas esperam por quem entrou (hoje: avisos por ler). Vira
  // um ponto vermelho sobre o ícone. É um ponto e não um número: com
  // cinco separadores a 375px não cabe um algarismo legível, e a
  // pergunta que a barra responde é "há alguma coisa?", não "quantas?" —
  // o número exato está na própria página.
  distintivo?: number
}

export function BottomNavigation({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 z-[80] flex justify-center px-[12px]"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="bottom-nav-bar relative flex w-full max-w-[430px] items-stretch gap-[2px] rounded-[var(--radius-pill)] px-[8px] py-[8px]"
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
              className="bottom-nav-item relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-[var(--radius-pill)] px-[2px] motion-safe:active:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{
                color: ativo ? '#ffffff' : 'rgba(255,255,255,.68)',
                backgroundColor: 'transparent',
              }}
            >
              {ativo && <span className="bottom-nav-ativo" aria-hidden="true" />}
              <span className="relative">
                <Icone className="bottom-nav-icon" size={20} strokeWidth={ativo ? 2 : 1.5} aria-hidden="true" />
                {item.distintivo ? (
                  <span className="bottom-nav-ponto" aria-hidden="true" />
                ) : null}
              </span>
              {/* O ponto é visual. Para quem navega com leitor de ecrã, a
                  contagem vai no texto — um ponto vermelho não se ouve. */}
              {item.distintivo ? (
                <span className="sr-only">
                  {item.distintivo === 1 ? '1 por ler' : `${item.distintivo} por ler`}
                </span>
              ) : null}
              {/* 11px com tracking apertado, e não 12px: com cinco
                  separadores a 375px cada um fica com ~75px, e a
                  secretaria tem os rótulos mais compridos da app —
                  "Pagamentos" e "Professores" apareciam cortados a meio
                  ("Pagament…", "Professor…"). Uma etiqueta de navegação
                  truncada deixa de ser uma etiqueta. */}
              <span className="max-w-full truncate text-[11px] font-medium leading-none tracking-[-0.01em]">
                {item.label}
              </span>
            </Link>
          )
        })}
        <SimboloCCG className="bottom-nav-marca" aria-hidden="true" />
      </div>
    </nav>
  )
}
