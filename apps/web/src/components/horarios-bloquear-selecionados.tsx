'use client'

export function BotaoBloquearSelecionados() {
  return (
    <button
      type="button"
      className="horarios-acao horarios-acao-principal"
      onClick={() => {
        const form = document.getElementById(
          'bloquear-horarios-form'
        ) as HTMLFormElement | null
        if (!form) return

        const selecionados = document.querySelectorAll<HTMLInputElement>(
          'input[name="horarioIds"]:checked'
        )

        form
          .querySelectorAll('input[name="horarioIds"]')
          .forEach((el) => el.remove())

        selecionados.forEach((checkbox) => {
          const hidden = document.createElement('input')
          hidden.type = 'hidden'
          hidden.name = 'horarioIds'
          hidden.value = checkbox.value
          form.appendChild(hidden)
        })

        form.requestSubmit()
      }}
    >
      Bloquear selecionados
    </button>
  )
}
