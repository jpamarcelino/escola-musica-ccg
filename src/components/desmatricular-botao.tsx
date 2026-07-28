'use client'

export function BotaoDesmatricular({ mensagemConfirmacao }: { mensagemConfirmacao: string }) {
  return (
    <button
      type="submit"
      className="w-full rounded border border-red-600/40 py-2 text-sm text-red-600 hover:bg-red-600/5"
      onClick={(e) => {
        if (!window.confirm(mensagemConfirmacao)) {
          e.preventDefault()
        }
      }}
    >
      Desmatricular aluno
    </button>
  )
}
