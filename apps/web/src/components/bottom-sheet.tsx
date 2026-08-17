'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

// Bottom sheet (DESIGN_SYSTEM_V2): Radix Dialog com entrada vertical em
// mobile e diálogo centrado a partir de md (o CSS .sheet-caixa trata da
// diferença). Focus-trap, Esc e botão de fechar vêm do Radix, como no
// ModalShell dos modais de conta.
export function BottomSheet({
  aberto = true,
  onFechar,
  titulo,
  tituloVisivel = true,
  children,
}: {
  aberto?: boolean
  onFechar?: () => void
  titulo: string
  // Alguns sheets desenham o seu próprio título estilizado — nesse caso o
  // Dialog.Title fica só para leitores de ecrã.
  tituloVisivel?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog.Root
      open={aberto}
      onOpenChange={(estado) => {
        if (!estado) onFechar?.()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-fundo" />
        <Dialog.Content className="sheet-caixa">
          {/* Pega visual do sheet — sinaliza "isto desliza", só em mobile. */}
          <div
            aria-hidden="true"
            className="mx-auto mb-[16px] h-[4px] w-[36px] rounded-full md:hidden"
            style={{ backgroundColor: 'var(--color-linha)' }}
          />
          {onFechar && (
            <Dialog.Close
              aria-label="Fechar"
              className="absolute right-[16px] top-[16px] rounded-full p-[6px] transition-colors hover:bg-[var(--color-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-mid)]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={18} strokeWidth={1.5} aria-hidden="true" />
            </Dialog.Close>
          )}
          <Dialog.Title asChild={tituloVisivel}>
            {tituloVisivel ? (
              <h1
                className="text-[22px] font-semibold leading-[1.2]"
                style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-text-primary)' }}
              >
                {titulo}
              </h1>
            ) : (
              <span className="sr-only">{titulo}</span>
            )}
          </Dialog.Title>
          <div className="mt-[14px]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
