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
        className="horarios-acao horarios-acao-perigo"
      >
        Apagar
      </button>
      {aviso && <span className="w-full text-[13px] text-[#9A3B2E]" role="alert">{aviso}</span>}

      <AlertDialog.Root open={aberto} onOpenChange={setAberto}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="modal-fundo" />
          <AlertDialog.Content className="modal-caixa pinterest-dialogo fixed left-1/2 top-1/2 z-50">
            <AlertDialog.Title>
              Apagar {ids.length === 1 ? 'este horário' : `${ids.length} horários`}?
            </AlertDialog.Title>
            <AlertDialog.Description>
              Esta ação remove os horários selecionados e não pode ser anulada.
            </AlertDialog.Description>
            <form action={action} className="pinterest-dialogo-acoes">
              {ids.map((id) => <input key={id} type="hidden" name="horarioIds" value={id} />)}
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
    </>
  )
}
