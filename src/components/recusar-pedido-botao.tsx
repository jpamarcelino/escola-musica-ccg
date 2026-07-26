'use client'

export function BotaoRecusarPedido({ mensagemConfirmacao }: { mensagemConfirmacao: string }) {
  return (
    <button
      type="submit"
      className="rounded border border-red-600/40 px-3 py-1 text-sm text-red-600 hover:bg-red-600/5"
      onClick={(e) => {
        if (!window.confirm(mensagemConfirmacao)) {
          e.preventDefault()
        }
      }}
    >
      Recusar
    </button>
  )
}
