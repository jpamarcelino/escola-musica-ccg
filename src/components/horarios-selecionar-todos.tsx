'use client'

export function BotaoSelecionarTodos() {
  return (
    <button
      type="button"
      className="horarios-acao horarios-acao-secundaria"
      onClick={() => {
        document
          .querySelectorAll<HTMLInputElement>('input[name="horarioIds"]')
          .forEach((el) => {
            el.checked = true
          })
        document.dispatchEvent(new Event('horarios:selecao'))
      }}
    >
      Selecionar todos
    </button>
  )
}
