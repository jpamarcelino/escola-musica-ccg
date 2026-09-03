'use client'

import { useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { SubmitButton } from '@/components/submit-button'
import { classesCampo } from '@/components/campo-formulario'

// Mudar o horário de uma turma de Bebés.
//
// O formulário é normal; o que não é normal é submetê-lo sem perguntar.
// Uma turma tem até dez famílias, e o sábado delas está montado à volta
// desta hora — por isso a confirmação diz de onde para onde vai e quantas
// pessoas são avisadas, em vez de "tens a certeza?".
//
// A confirmação não substitui o formulário: os valores continuam a ser os
// dos campos, e o diálogo só decide se se carrega no submit. Duplicar os
// campos em inputs escondidos era arriscar que os dois divergissem.
export function ConfirmarHorarioTurma({
  turmaId,
  nome,
  diaAtual,
  inicioAtual,
  fimAtual,
  inscritos,
  dias,
  action,
}: {
  turmaId: number
  nome: string
  diaAtual: string
  inicioAtual: string
  fimAtual: string
  inscritos: number
  dias: string[]
  action: (formData: FormData) => void | Promise<void>
}) {
  const [dia, setDia] = useState(diaAtual)
  const [inicio, setInicio] = useState(inicioAtual)
  const [fim, setFim] = useState(fimAtual)
  const [aberto, setAberto] = useState(false)

  const mudou = dia !== diaAtual || inicio !== inicioAtual || fim !== fimAtual

  return (
    <form action={action} className="space-y-2" style={{ marginTop: 14 }}>
      <input type="hidden" name="turmaId" value={turmaId} />

      <div className="grid grid-cols-[1fr] gap-2 sm:grid-cols-[1.2fr_1fr_1fr]">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-tinta-suave)' }}>Dia</span>
          <select name="diaSemana" value={dia} onChange={(e) => setDia(e.target.value)} className={classesCampo}>
            {dias.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-tinta-suave)' }}>Começa</span>
          <input type="time" name="horaInicio" value={inicio} onChange={(e) => setInicio(e.target.value)} className={classesCampo} />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[12.5px] font-medium" style={{ color: 'var(--color-tinta-suave)' }}>Acaba</span>
          <input type="time" name="horaFim" value={fim} onChange={(e) => setFim(e.target.value)} className={classesCampo} />
        </label>
      </div>

      <AlertDialog.Root open={aberto} onOpenChange={setAberto}>
        <AlertDialog.Trigger asChild>
          <button type="button" className="horarios-criar-botao" disabled={!mudou}>
            {mudou ? 'Guardar horário' : 'Sem alterações'}
          </button>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="modal-fundo" />
          <AlertDialog.Content className="modal-caixa pinterest-dialogo fixed left-1/2 top-1/2 z-50">
            <AlertDialog.Title>Mudar o horário da turma?</AlertDialog.Title>
            <AlertDialog.Description>
              {nome} passa de {diaAtual}, {inicioAtual}–{fimAtual} para {dia}, {inicio}–{fim}.
              {inscritos > 0
                ? ` ${inscritos} ${inscritos === 1 ? 'família é avisada' : 'famílias são avisadas'}, e os professores da turma também.`
                : ' Os professores da turma são avisados.'}
            </AlertDialog.Description>
            <div className="pinterest-dialogo-acoes">
              <SubmitButton textoAGuardar="A guardar…" className="pinterest-dialogo-confirmar" style={{ backgroundColor: 'var(--color-azul-fundo)' }}>
                Mudar o horário
              </SubmitButton>
              <AlertDialog.Cancel asChild>
                <button type="button" className="pinterest-dialogo-cancelar">Cancelar</button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </form>
  )
}
