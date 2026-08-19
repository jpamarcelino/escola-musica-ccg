'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { SubmitButton } from '@/components/submit-button'

// Substitui os botões que pediam confirmação com window.confirm() (recusar
// pedido, desmatricular, cancelar matrícula, apagar conta, confirmar
// horário) por um <AlertDialog> (Radix, restilizado): focus-trap e ESC
// corretos, e espaço para explicar a consequência em vez de só uma frase
// de sistema.
//
// Tom "perigo" (omissão): reutiliza o vermelho de MensagemErro, para não
// introduzir um segundo tom de erro na app — usar em ações destrutivas.
// Tom "neutro": azul da marca — usar em ações que só precisam de uma
// pausa de confirmação, sem serem destrutivas (ex: confirmar uma aula).
const COR_PERIGO = '#9A3B2E'
const COR_NEUTRO = 'var(--color-azul-fundo)'

const CLASSES_FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-azul)] motion-reduce:transition-none'

const CLASSES_GATILHO_INLINE = `inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] px-3 text-[13px] font-semibold transition-colors disabled:opacity-50 ${CLASSES_FOCO}`

const CLASSES_GATILHO_BLOCO = `flex h-[44px] w-full items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] text-[14px] font-semibold transition-colors disabled:opacity-50 ${CLASSES_FOCO}`
const CLASSES_GATILHO_EDITORIAL = `inline-flex min-h-[44px] items-center justify-center rounded-[4px] border px-3 text-[13px] font-semibold transition-colors disabled:opacity-50 ${CLASSES_FOCO}`

export function BotaoAcaoDestruir({
  label,
  titulo = 'Tens a certeza?',
  mensagem,
  action,
  variante = 'inline',
  tom = 'perigo',
  children,
}: {
  label: string
  titulo?: string
  mensagem: string
  action: (formData: FormData) => void | Promise<void>
  // "inline" — botão pequeno, ao lado de outro conteúdo (ex: linha de um pedido).
  // "bloco" — ocupa a largura toda, alvo de toque de 44px (ex: fundo de página).
  variante?: 'inline' | 'bloco' | 'editorial'
  tom?: 'perigo' | 'neutro'
  // Inputs escondidos com os dados que a Server Action precisa (ex: id).
  children?: React.ReactNode
}) {
  const cor = tom === 'perigo' ? COR_PERIGO : COR_NEUTRO
  const estiloGatilho =
    tom === 'perigo'
      ? { borderColor: `${COR_PERIGO}66`, color: COR_PERIGO }
      : { borderColor: 'var(--color-azul-fundo)', color: 'var(--color-azul-fundo)' }

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button
          type="button"
          className={`${variante === 'bloco' ? CLASSES_GATILHO_BLOCO : variante === 'editorial' ? CLASSES_GATILHO_EDITORIAL : CLASSES_GATILHO_INLINE} hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)]`}
          style={estiloGatilho}
        >
          {label}
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="modal-fundo" />
        {/* modal-caixa não está aninhada dentro de modal-fundo aqui (o
            AlertDialog do Radix renderiza Overlay e Content como irmãos),
            por isso a centragem flex do overlay não chega até aqui —
            repete-se com position fixed + transform. */}
        <AlertDialog.Content
          className="modal-caixa fixed left-1/2 top-1/2 z-50"
        >

          <AlertDialog.Title
            className="text-[17px] font-semibold"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
          >
            {titulo}
          </AlertDialog.Title>
          <AlertDialog.Description
            className="mt-[8px] text-[14px] leading-[1.5]"
            style={{ color: 'var(--color-tinta-suave)' }}
          >
            {mensagem}
          </AlertDialog.Description>
          <form action={action} className="mt-[22px] flex justify-end gap-[10px]">
            {children}
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className={`rounded-[var(--radius-pill)] px-4 py-[10px] text-[14px] font-medium transition-colors hover:bg-[var(--color-papel-2)] ${CLASSES_FOCO}`}
                style={{ color: 'var(--color-tinta-suave)' }}
              >
                Cancelar
              </button>
            </AlertDialog.Cancel>
            {/* Propositadamente NÃO é <AlertDialog.Action>: esse componente
                fecha o diálogo (desmonta o <form>) no mesmo clique que
                dispara a submissão, e a Server Action perde-se a meio —
                um botão de submit normal deixa o próprio resultado da ação
                (redirect ou a linha a desaparecer da lista) fechar isto. */}
            <SubmitButton
              textoAGuardar="A confirmar…"
              className={`rounded-[var(--radius-pill)] px-4 py-[10px] text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${CLASSES_FOCO}`}
              style={{ backgroundColor: cor }}
            >
              {label}
            </SubmitButton>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
