'use client'

export function BotaoApagarConta({ action }: { action: () => void }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="rounded border border-red-600/40 px-4 py-2 text-sm text-red-600 hover:bg-red-600/5"
        onClick={(e) => {
          if (
            !window.confirm(
              'Tens a certeza que queres apagar a tua conta? Esta ação é irreversível — perdes o acesso e todos os teus dados de conta são apagados. (O histórico de presenças e mensalidades mantém-se.)'
            )
          ) {
            e.preventDefault()
          }
        }}
      >
        Apagar conta
      </button>
    </form>
  )
}
