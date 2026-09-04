'use client'

import { useActionState } from 'react'
import { atualizarPassword } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/password-input'
import { Cartao } from '@/components/cartao'
import { BotaoPrimario } from '@/components/botao-primario'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { Campo, CampoTexto, classesCampo } from '@/components/campo-formulario'
import { CampoCodigo } from '@/components/campo-codigo'
import { MensagemErro } from '@/components/mensagem'

export default function RedefinirPasswordForm({
  temSessao,
  email,
}: {
  temSessao: boolean
  email: string | null
}) {
  const [state, action, pending] = useActionState(atualizarPassword, undefined)

  return (
    <div className="space-y-[14px]">
      <Cartao>
        <form action={action} className="space-y-[14px]">
          <h1
            className="text-[22px] font-semibold leading-[1.2]"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
          >
            Definir nova password
          </h1>

          {/* Quem veio pelo link já está identificado e só escreve a
              password. Quem veio pelo código escreve-o primeiro — e o
              código é o que identifica a pessoa, por isso vem antes. */}
          {!temSessao && (
            <>
              <p
                className="text-[14.5px] leading-[1.55]"
                style={{ color: 'var(--color-tinta-suave)' }}
              >
                {email ? (
                  <>
                    Se existir uma conta com <strong>{email}</strong>, enviámos-lhe um código de
                    seis algarismos.
                  </>
                ) : (
                  <>Escreve o email da conta e o código que recebeste.</>
                )}
              </p>

              {!email && (
                <CampoTexto
                  id="email"
                  name="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  defaultValue={state?.valores?.email ?? ''}
                />
              )}

              <CampoCodigo />
            </>
          )}

          <Campo id="password" label="Nova password">
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              className={classesCampo}
            />
          </Campo>

          {state?.error && <MensagemErro>{state.error}</MensagemErro>}

          <BotaoPrimario disabled={pending}>
            {pending ? 'A guardar…' : 'Guardar password'}
          </BotaoPrimario>
        </form>
      </Cartao>

      <div className="flex flex-col items-center">
        <LigacaoTerciaria href="/esqueci-password">
          Não recebeste o código? Pedir outro
        </LigacaoTerciaria>
      </div>
    </div>
  )
}
