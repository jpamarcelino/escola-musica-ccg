'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'

// Popup que pede a idade do futuro aluno antes de mostrar as disciplinas —
// só serve para filtrar/ordenar os cartões (azul = adequado, cinza =
// não), a idade real só fica gravada quando o perfil de aluno é criado
// mais tarde. Acrescenta "idade" à URL atual, seguindo o mesmo padrão dos
// outros passos do wizard (estado guardado nos searchParams, não em React).
export function SeletorIdade() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [idade, setIdade] = useState(8)

  function confirmar() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('idade', String(idade))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="modal-fundo">
      <div className="modal-caixa space-y-4">
        <h1 className="text-xl font-semibold">Que idade tem o futuro aluno?</h1>
        <p className="text-sm text-foreground/60">
          Só para te mostrarmos as disciplinas certas para essa idade.
        </p>
        <select
          value={idade}
          onChange={(e) => setIdade(Number(e.target.value))}
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-lg text-center"
        >
          {Array.from({ length: 100 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'ano' : 'anos'}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={confirmar}
          className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
