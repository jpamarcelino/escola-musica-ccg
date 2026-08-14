'use client'

import { useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { SubmitButton } from '@/components/submit-button'

export function BotaoApagarHorariosSelecionados({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>
}) {
  const [aberto, setAberto] = useState(false)
  const [ids, setIds] = useState<string[]>([])
  const [aviso, setAviso] = useState('')

  function preparar() {
    const selecionados = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="horarioIds"]:checked')
    ).map((input) => input.value)

    if (selecionados.length === 0) {
      setAviso('Seleciona pelo menos um horário.')
      return
    }

    setAviso('')
    setIds(selecionados)
    setAberto(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={preparar}
        className="min-h-[44px] rounded-[var(--radius-pill)] border border-[#9A3B2E66] px-[14px] text-[14px] font-semibold text-[#9A3B2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-azul)]"
      >
        Apagar
      </button>
      {aviso && <span className="w-full text-[13px] text-[#9A3B2E]" role="alert">{aviso}</span>}

      <AlertDialog.Root open={aberto} onOpenChange={setAberto}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="modal-fundo" />
          <AlertDialog.Content className="modal-caixa fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
            <AlertDialog.Title className="text-[17px] font-semibold text-[var(--color-azul-fundo)]">
              Apagar {ids.length === 1 ? 'este horário' : `${ids.length} horários`}?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-[8px] text-[14px] leading-[1.5] text-[var(--color-tinta-suave)]">
              Esta ação remove os horários selecionados e não pode ser anulada.
            </AlertDialog.Description>
            <form action={action} className="mt-[22px] flex justify-end gap-[10px]">
              {ids.map((id) => <input key={id} type="hidden" name="horarioIds" value={id} />)}
              <AlertDialog.Cancel asChild>
                <button type="button" className="min-h-[44px] rounded-[var(--radius-pill)] px-4 text-[14px] font-medium">
                  Cancelar
                </button>
              </AlertDialog.Cancel>
              <SubmitButton
                textoAGuardar="A apagar..."
                className="min-h-[44px] rounded-[var(--radius-pill)] bg-[#9A3B2E] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                Apagar
              </SubmitButton>
            </form>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}
