'use client'

export function BotaoConfirmarHorario({
  label,
  mensagemConfirmacao,
}: {
  label: string
  mensagemConfirmacao: string
}) {
  return (
    <button
      type="submit"
      className="rounded border border-foreground/20 px-3 py-1 text-sm hover:bg-foreground/5"
      onClick={(e) => {
        if (!window.confirm(mensagemConfirmacao)) {
          e.preventDefault()
        }
      }}
    >
      {label}
    </button>
  )
}
