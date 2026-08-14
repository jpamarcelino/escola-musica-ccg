'use client'

export function BotaoSelecionarTodos() {
  return (
    <button
      type="button"
      className="min-h-[44px] rounded-[var(--radius-pill)] border border-foreground/20 px-[14px] text-[14px] font-semibold hover:bg-foreground/5"
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
