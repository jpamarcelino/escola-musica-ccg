import Link from 'next/link'
import { BotaoPrimario } from '@/components/botao-primario'

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-[22px] py-[26px] text-center">
      <div className="w-full max-w-[380px] space-y-[22px]">
        <div>
          <p
            className="text-[15px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'var(--color-azul-logo)' }}
          >
            Página não encontrada
          </p>
          <h1
            className="mt-[8px] text-[22px] font-semibold leading-[1.2]"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
          >
            Isto não existe, ou já não existe aqui
          </h1>
          <p className="mt-[10px] text-[14px] leading-[1.5]" style={{ color: 'var(--color-tinta-suave)' }}>
            A página que procuravas pode ter sido movida ou o link pode estar errado.
          </p>
        </div>
        <BotaoPrimario href="/">Voltar ao início</BotaoPrimario>
        <Link
          href="/dashboard"
          className="block text-[14px] font-medium underline [text-underline-offset:3px]"
          style={{ color: 'var(--color-tinta-suave)' }}
        >
          Ir para a minha conta
        </Link>
      </div>
    </main>
  )
}
