'use client'

import { useEffect, useState } from 'react'
import {
  APARENCIAS,
  APARENCIA_PREDEFINIDA,
  aplicarAparencia,
  guardarAparencia,
  lerAparencia,
  type Aparencia,
} from '@/lib/aparencia'

export function SeletorAparencia() {
  // Começa na predefinição e não no valor guardado: o servidor não sabe o
  // que está no localStorage, e ler no primeiro render daria HTML
  // diferente do do servidor. O valor certo entra no efeito, já no
  // browser.
  const [escolha, setEscolha] = useState<Aparencia>(APARENCIA_PREDEFINIDA)
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setEscolha(lerAparencia())
    setMontado(true)
  }, [])

  // Em "Sistema", a escolha não é um valor fixo: se o telemóvel passar a
  // escuro ao anoitecer, a app tem de acompanhar sem ser recarregada.
  useEffect(() => {
    if (escolha !== 'sistema') return
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const aoMudar = () => aplicarAparencia('sistema')
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [escolha])

  function escolher(valor: Aparencia) {
    setEscolha(valor)
    guardarAparencia(valor)
    aplicarAparencia(valor)
  }

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Aparência"
        className="flex gap-2 rounded-[var(--radius-pill,999px)] border border-[var(--color-linha)] bg-[var(--color-papel)] p-1"
      >
        {APARENCIAS.map(({ valor, rotulo }) => {
          const ativo = montado && escolha === valor
          return (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => escolher(valor)}
              className={`flex-1 rounded-[999px] px-4 py-2 text-[14px] font-medium transition-colors motion-reduce:transition-none ${
                ativo
                  ? 'bg-[var(--color-azul-fundo)] text-white'
                  : 'text-[var(--color-tinta-suave)] hover:bg-[var(--color-papel-2)]'
              }`}
            >
              {rotulo}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-foreground/50">
        A escolha fica guardada neste aparelho. O tema escuro ainda está a ser feito — por
        enquanto os ecrãs continuam claros nas três opções.
      </p>
    </div>
  )
}
