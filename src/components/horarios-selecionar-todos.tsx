'use client'

export function BotaoSelecionarTodos() {
  return (
    <button
      type="button"
      className="rounded border border-foreground/20 px-3 py-1 text-sm hover:bg-foreground/5"
      onClick={() => {
        document
          .querySelectorAll<HTMLInputElement>('input[name="horarioIds"]')
          .forEach((el) => {
            el.checked = true
          })
      }}
    >
      Selecionar todos
    </button>
  )
}
