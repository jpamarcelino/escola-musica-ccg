'use client'

import { useEffect } from 'react'

// Rede de segurança para erros que rebentam o próprio layout raiz (muito
// raro). Substitui a app inteira, por isso traz o seu próprio <html>/<body>
// e não pode depender de componentes que assumam o layout normal.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="pt">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '22px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          backgroundColor: '#FBF8F3',
          color: '#241F1C',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 380 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1B4F7A' }}>
            Não foi possível carregar a aplicação
          </h1>
          <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, color: '#6B615A' }}>
            Tenta recarregar a página. Se continuar a acontecer, contacta a secretaria.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 22,
              height: 52,
              width: '100%',
              borderRadius: 13,
              backgroundColor: '#1B4F7A',
              color: '#fff',
              fontSize: '15.5px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
