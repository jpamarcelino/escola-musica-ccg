'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from '@/lib/actions/auth'
import { InstalarCallout } from '@/components/instalar-callout'
import { PasswordInput } from '@/components/password-input'
import { Cartao } from '@/components/cartao'
import { BotaoPrimario } from '@/components/botao-primario'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { Campo, CampoTexto, classesCampo } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  const searchParams = useSearchParams()
  const erroLink = searchParams.get('erro')

  return (
    <div className="space-y-[14px]">
      <Cartao>
        <form action={action} className="space-y-[14px]">
          <h1
            className="text-[22px] font-semibold leading-[1.2]"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
          >
            Entrar
          </h1>

          {erroLink && <MensagemErro>{erroLink}</MensagemErro>}

          <CampoTexto id="email" name="email" label="Email" type="email" />

          <Campo id="password" label="Password">
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              className={classesCampo}
            />
          </Campo>

          {state?.error && <MensagemErro>{state.error}</MensagemErro>}

          <BotaoPrimario disabled={pending}>
            {pending ? 'A entrar...' : 'Entrar'}
          </BotaoPrimario>

          <div className="flex flex-col items-center gap-[8px] pt-[4px]">
            <LigacaoTerciaria href="/esqueci-password">
              Esqueceste-te da password?
            </LigacaoTerciaria>
            <LigacaoTerciaria href="/registo">
              Ainda não tens conta? Criar conta
            </LigacaoTerciaria>
          </div>
        </form>
      </Cartao>

      <InstalarCallout />
    </div>
  )
}
