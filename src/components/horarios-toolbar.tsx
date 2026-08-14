'use client'

import { useEffect, useState, type ReactNode } from 'react'

export function HorariosToolbar({ children }: { children: ReactNode }) {
  const [selecionados, setSelecionados] = useState(0)

  useEffect(() => {
    function atualizar() {
      setSelecionados(
        document.querySelectorAll<HTMLInputElement>('input[name="horarioIds"]:checked').length
      )
    }

    document.addEventListener('change', atualizar)
    document.addEventListener('horarios:selecao', atualizar)
    atualizar()
    return () => {
      document.removeEventListener('change', atualizar)
      document.removeEventListener('horarios:selecao', atualizar)
    }
  }, [])

  return (
    <div className="horarios-toolbar" aria-live="polite">
      {selecionados === 0 ? (
        <p>Seleciona horários para os bloquear, desbloquear ou apagar.</p>
      ) : (
        <>
          <strong>{selecionados} {selecionados === 1 ? 'selecionado' : 'selecionados'}</strong>
          <div>{children}</div>
        </>
      )}
    </div>
  )
}
