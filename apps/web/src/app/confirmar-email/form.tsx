'use client'

import { useActionState } from 'react'
import { confirmarEmail, reenviarCodigoRegisto } from '@/lib/actions/auth'
import { Cartao } from '@/components/cartao'
import { BotaoPrimario } from '@/components/botao-primario'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { CampoCodigo } from '@/components/campo-codigo'
import { CampoTexto } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'
import { ReenviarCodigo } from '@/components/reenviar-codigo'

export default function ConfirmarEmailForm({ email }: { email: string | null }) {
  const [state, action, pending] = useActionState(confirmarEmail, undefined)

  return (
    <div className="space-y-[14px]">
      <Cartao>
        <form action={action} className="space-y-[14px]">
          <h1
            className="text-[22px] font-semibold leading-[1.2]"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
          >
            Confirma o teu email
          </h1>

          <p className="text-[14.5px] leading-[1.55]" style={{ color: 'var(--color-tinta-suave)' }}>
            {email ? (
              <>
                Enviámos um código de seis algarismos para <strong>{email}</strong>. Escreve-o
                aqui para terminares a criação da conta.
              </>
            ) : (
              <>
                Enviámos um código de seis algarismos para o email com que criaste a conta.
                Escreve os dois aqui para terminares.
              </>
            )}
          </p>

          {/* Só quando o cookie já não existe — a pessoa voltou noutro dia,
              ou noutro browser. Sem isto ficava com um código na mão e
              sem sítio onde o usar. */}
          {!email && (
            <CampoTexto
              id="email"
              name="email"
              label="Email"
              type="email"
              defaultValue={state?.valores?.email ?? ''}
            />
          )}

          <CampoCodigo />

          {state?.error && <MensagemErro>{state.error}</MensagemErro>}

          <BotaoPrimario disabled={pending}>
            {pending ? 'A confirmar…' : 'Confirmar'}
          </BotaoPrimario>
        </form>
      </Cartao>

      <ReenviarCodigo accao={reenviarCodigoRegisto} email={email} />

      <div className="flex flex-col items-center">
        <LigacaoTerciaria href="/login">Voltar a entrar</LigacaoTerciaria>
      </div>
    </div>
  )
}
