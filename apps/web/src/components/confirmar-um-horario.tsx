'use client'

import { useEffect, useRef, useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'

const CLASSES_FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-azul)] motion-reduce:transition-none'

// Quantos horários escolhidos há neste formulário, agora.
function contarEscolhidos(form: HTMLFormElement): number {
  return form.querySelectorAll('input[name="horarios"]:checked').length
}

// A pausa só faz sentido quando escolher mais era mesmo uma opção: com um
// único horário livre na grelha do professor, "escolhe mais" seria um
// conselho impossível de seguir.
export function deveAvisarUmHorario(form: HTMLFormElement, horariosDisponiveis: number): boolean {
  return horariosDisponiveis > 1 && contarEscolhidos(form) === 1
}

// O popup em si. Não fecha sozinho: quem o mostra decide o que acontece a
// seguir (voltar à grelha ou enviar mesmo assim).
export function ModalUmHorario({
  onEscolherMais,
  onEnviarAssim,
}: {
  onEscolherMais: () => void
  onEnviarAssim: () => void
}) {
  return (
    <AlertDialog.Root open>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="modal-fundo" />
        {/* Como nos restantes diálogos: o Radix rende Overlay e Content
            como irmãos, por isso a centragem repete-se aqui. */}
        <AlertDialog.Content className="modal-caixa pinterest-dialogo fixed left-1/2 top-1/2 z-50">
          <AlertDialog.Title>Só uma opção de horário?</AlertDialog.Title>
          <AlertDialog.Description>
            Escolheste um único horário. Se marcares mais opções, há mais
            hipóteses de haver uma que dê para os dois — e o professor consegue
            responder sem ter de combinar tudo outra vez contigo.
          </AlertDialog.Description>
          <div className="pinterest-dialogo-acoes">
            <button
              type="button"
              onClick={onEnviarAssim}
              className={`pinterest-dialogo-confirmar ${CLASSES_FOCO}`}
              style={{ backgroundColor: 'var(--color-azul-fundo)' }}
            >
              Enviar assim mesmo
            </button>
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                onClick={onEscolherMais}
                className={`pinterest-dialogo-cancelar ${CLASSES_FOCO}`}
              >
                Escolher mais horários
              </button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

// Versão para o formulário do fluxo autenticado (/aluno/[id]/pedido), que
// é renderizado no servidor e submete direto para a Server Action. Este
// componente monta-se lá dentro só para pendurar um travão no submit do
// <form> que o rodeia — assim o formulário continua a ser o que era, sem
// ter de passar a componente de cliente inteiro.
export function AvisoUmHorario({ horariosDisponiveis }: { horariosDisponiveis: number }) {
  const [aberto, setAberto] = useState(false)
  const ancoraRef = useRef<HTMLSpanElement>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  // Um ref e não estado: o listener do submit é registado uma vez e tem de
  // ver o valor atual, não o da altura em que foi registado.
  const confirmadoRef = useRef(false)

  useEffect(() => {
    const form = ancoraRef.current?.closest('form')
    if (!form) return
    formRef.current = form

    function aoSubmeter(evento: SubmitEvent) {
      if (confirmadoRef.current) return
      if (!deveAvisarUmHorario(form as HTMLFormElement, horariosDisponiveis)) return
      evento.preventDefault()
      setAberto(true)
    }

    form.addEventListener('submit', aoSubmeter)
    return () => form.removeEventListener('submit', aoSubmeter)
  }, [horariosDisponiveis])

  return (
    <span ref={ancoraRef} className="contents">
      {aberto && (
        <ModalUmHorario
          onEscolherMais={() => setAberto(false)}
          onEnviarAssim={() => {
            setAberto(false)
            confirmadoRef.current = true
            formRef.current?.requestSubmit()
          }}
        />
      )}
    </span>
  )
}
