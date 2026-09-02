'use client'

import { useRef, useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Trash2 } from 'lucide-react'
import { SubmitButton } from '@/components/submit-button'
import { apagarNotificacao } from '@/lib/actions/notificacoes'

// Quanto o cartão anda no máximo, e a partir de onde o gesto conta.
//
// Abaixo do limiar só se vê o vermelho e não acontece nada ao largar: é o
// arrependimento a meio, que num gesto sem botão tem de ser possível. O
// caixote só aparece depois do limiar, e é ele que promete o que vem a
// seguir — quem o vê sabe que ao largar lhe vai ser perguntado algo.
const LIMITE = 96
const LIMIAR = 56
// Antes disto não se sabe se o dedo quer arrastar a linha ou rolar a
// lista. Decidir cedo de mais rouba o scroll a quem só queria descer.
const FOLGA = 8

export function AvisoDeslizavel({
  id,
  titulo,
  children,
}: {
  id: number
  // Para a confirmação dizer qual, e não "este aviso".
  titulo: string
  children: React.ReactNode
}) {
  const [x, setX] = useState(0)
  const [aDeslizar, setADeslizar] = useState(false)
  const [aberto, setAberto] = useState(false)
  const inicio = useRef<{ x: number; y: number } | null>(null)
  // O clique que vem a seguir a um arrasto tem de ser engolido: a linha
  // inteira é uma ligação para o aviso, e sem isto arrastar para apagar
  // abria o aviso pelo caminho.
  const arrastou = useRef(false)
  // null enquanto não se sabe a direção; depois true (horizontal, é
  // nosso) ou false (vertical, é da lista).
  const horizontal = useRef<boolean | null>(null)

  function aoDescer(e: React.PointerEvent) {
    // Só o dedo e o rato. Uma caneta ou um clique do meio não arrastam.
    if (e.pointerType === 'mouse' && e.button !== 0) return
    inicio.current = { x: e.clientX, y: e.clientY }
    horizontal.current = null
    arrastou.current = false
    setADeslizar(true)
  }

  function aoMover(e: React.PointerEvent) {
    if (!inicio.current) return
    const dx = e.clientX - inicio.current.x
    const dy = e.clientY - inicio.current.y

    if (horizontal.current === null) {
      if (Math.abs(dx) < FOLGA && Math.abs(dy) < FOLGA) return
      horizontal.current = Math.abs(dx) > Math.abs(dy)
      if (!horizontal.current) {
        inicio.current = null
        setADeslizar(false)
        return
      }
      // Só agora se captura o ponteiro: até aqui o gesto ainda podia ser
      // da lista, e capturar antes disso matava o scroll.
      e.currentTarget.setPointerCapture(e.pointerId)
      arrastou.current = true
    }

    // Só para a esquerda. Puxar para a direita não abre nada do outro
    // lado, por isso não deve dar a entender que abre.
    setX(Math.max(-LIMITE, Math.min(0, dx)))
  }

  function aoLargar() {
    if (!inicio.current && horizontal.current !== true) {
      setADeslizar(false)
      return
    }
    const passou = x <= -LIMIAR
    inicio.current = null
    horizontal.current = null
    setADeslizar(false)
    setX(0)
    if (passou) setAberto(true)
  }

  const mostraCaixote = x <= -LIMIAR

  return (
    <div className="aviso-deslizavel" data-aberto={x < 0 || undefined}>
      {/* O que fica por baixo. É um botão a sério e não um adereço: quem
          navega por teclado chega-lhe pelo Tab, e ao receber foco o
          cartão desliza sozinho para o revelar. Um gesto que só existe
          para quem tem dedos não é uma funcionalidade, é um atalho. */}
      <button
        type="button"
        className="aviso-deslizavel-apagar"
        aria-label={`Apagar o aviso ${titulo}`}
        onFocus={() => setX(-LIMITE)}
        onBlur={() => setX(0)}
        onClick={() => setAberto(true)}
      >
        <Trash2 size={20} strokeWidth={2} aria-hidden="true" />
      </button>

      <div
        className="aviso-deslizavel-carta"
        data-caixote={mostraCaixote || undefined}
        style={{
          transform: `translate3d(${x}px, 0, 0)`,
          // Enquanto o dedo está em cima não há transição: a linha tem de
          // acompanhar o dedo. A transição serve o largar.
          transition: aDeslizar ? 'none' : 'transform .22s cubic-bezier(.22,.61,.36,1)',
        }}
        onPointerDown={aoDescer}
        onPointerMove={aoMover}
        onPointerUp={aoLargar}
        onPointerCancel={aoLargar}
        onClickCapture={(e) => {
          if (!arrastou.current) return
          e.preventDefault()
          e.stopPropagation()
          arrastou.current = false
        }}
      >
        {children}
      </div>

      <AlertDialog.Root open={aberto} onOpenChange={setAberto}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="modal-fundo" />
          <AlertDialog.Content className="modal-caixa pinterest-dialogo fixed left-1/2 top-1/2 z-50">
            <AlertDialog.Title>Apagar este aviso?</AlertDialog.Title>
            <AlertDialog.Description>
              {titulo} desaparece da tua caixa de entrada e não há como o recuperar.
            </AlertDialog.Description>
            <form action={apagarNotificacao} className="pinterest-dialogo-acoes">
              <input type="hidden" name="notificacaoId" value={id} />
              <SubmitButton
                textoAGuardar="A apagar…"
                className="pinterest-dialogo-confirmar"
                style={{ backgroundColor: '#9A3B2E' }}
              >
                Apagar
              </SubmitButton>
              <AlertDialog.Cancel asChild>
                <button type="button" className="pinterest-dialogo-cancelar">
                  Cancelar
                </button>
              </AlertDialog.Cancel>
            </form>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
