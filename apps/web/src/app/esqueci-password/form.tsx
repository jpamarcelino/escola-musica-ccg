'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { pedirRecuperacaoPassword } from '@/lib/actions/auth'
import { Cartao } from '@/components/cartao'
import { BotaoPrimario } from '@/components/botao-primario'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { CampoTexto } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'

export default function EsqueciPasswordForm() {
  const [state, action, pending] = useActionState(pedirRecuperacaoPassword, undefined)
  // Quem vem de um link que já não servia é atirado para aqui com o
  // motivo à frente. Sem isto, chegava a esta página sem perceber porque
  // e voltava a fazer exactamente o mesmo.
  const erroLink = useSearchParams().get('erro')

  return (
    <div className="space-y-[14px]">
      <Cartao>
        <form action={action} className="space-y-[14px]">
          <h1
            className="text-[22px] font-semibold leading-[1.2]"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
          >
            Recuperar password
          </h1>

          <p className="text-[14.5px] leading-[1.55]" style={{ color: 'var(--color-tinta-suave)' }}>
            Escreve o teu email e enviamos-te um código de seis algarismos para definires uma
            password nova.
          </p>

          {erroLink && <MensagemErro>{erroLink}</MensagemErro>}

          <CampoTexto id="email" name="email" label="Email" type="email" autoComplete="email" />

          {state?.error && <MensagemErro>{state.error}</MensagemErro>}

          <BotaoPrimario disabled={pending}>
            {pending ? 'A enviar…' : 'Enviar código'}
          </BotaoPrimario>
        </form>
      </Cartao>

      <div className="flex flex-col items-center">
        <LigacaoTerciaria href="/login">Voltar a entrar</LigacaoTerciaria>
      </div>
    </div>
  )
}
