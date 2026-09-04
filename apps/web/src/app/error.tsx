'use client'

import { useEffect } from 'react'
import { BotaoPrimario } from '@/components/botao-primario'
import { BotaoSecundario } from '@/components/botao-secundario'

// Boundary de erro do Next.js — apanha o que rebenta a meio do render de
// uma página. Nunca mostra a mensagem técnica ao utilizador (secção 16 do
// pedido: erros têm de ser humanos e acionáveis); a mensagem real só vai
// para a consola, para quem estiver a testar/depurar.
export default function ErrorBoundary({
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
    <main className="pagina-recado flex-1 flex flex-col items-center justify-center px-[22px] py-[26px] text-center">
      <div className="w-full max-w-[380px] space-y-[22px]">
        <div>
          <p
            className="text-[15px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: '#9A3B2E' }}
          >
            Algo correu mal
          </p>
          <h1
            className="mt-[8px] text-[22px] font-semibold leading-[1.2]"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
          >
            Não foi possível carregar esta página
          </h1>
          <p className="mt-[10px] text-[14px] leading-[1.5]" style={{ color: 'var(--color-tinta-suave)' }}>
            Não perdeste nada — tenta outra vez. Se continuar a acontecer, contacta a
            secretaria.
          </p>
        </div>
        <BotaoPrimario onClick={reset}>Tentar novamente</BotaoPrimario>
        <BotaoSecundario href="/dashboard">Voltar à conta</BotaoSecundario>
      </div>
    </main>
  )
}
