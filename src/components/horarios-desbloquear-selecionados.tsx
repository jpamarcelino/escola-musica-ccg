'use client'

export function BotaoDesbloquearSelecionados() {
  return (
    <button
      type="button"
      className="rounded border border-foreground/20 px-3 py-1 text-sm hover:bg-foreground/5"
      onClick={() => {
        const form = document.getElementById(
          'desbloquear-horarios-form'
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
      Desbloquear selecionados
    </button>
  )
}
