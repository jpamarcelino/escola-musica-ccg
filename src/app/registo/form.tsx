'use client'

import { useActionState } from 'react'
import { signup } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/password-input'
import { Cartao } from '@/components/cartao'
import { BotaoPrimario } from '@/components/botao-primario'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { Campo, CampoTexto, classesCampo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo, MensagemNota } from '@/components/mensagem'

type ConviteInfo = {
  tipo: string
  programa: string | null
  aluno_nome: string | null
  valido: boolean
} | null

const PROGRAMA_LABEL: Record<string, string> = {
  musica: 'Música',
  danca: 'Dança',
}

export default function RegistoForm({
  conviteCodigo,
  conviteInfo,
}: {
  conviteCodigo: string | null
  conviteInfo: ConviteInfo
}) {
  const [state, action, pending] = useActionState(signup, undefined)

  // Impede escolher uma data futura no próprio seletor do browser.
  const hoje = new Date().toISOString().slice(0, 10)

  const conviteInvalido = conviteCodigo && (!conviteInfo || !conviteInfo.valido)

  return (
    <Cartao>
      <form action={action} className="space-y-[14px]">
        <h1
          className="text-[22px] font-semibold leading-[1.2]"
          style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
        >
          Criar Conta CCG
        </h1>

        {conviteCodigo && (
          <input type="hidden" name="conviteCodigo" value={conviteCodigo} />
        )}

        {conviteInvalido && (
          <MensagemErro>
            Este link de convite é inválido ou já foi utilizado. Podes na mesma criar uma conta
            normal abaixo.
          </MensagemErro>
        )}

        {conviteInfo?.valido && conviteInfo.tipo === 'professor' && (
          <MensagemNota>
            Este link cria uma conta de <strong>professor</strong>
            {conviteInfo.programa && ` — Escola de ${PROGRAMA_LABEL[conviteInfo.programa]}`}.
          </MensagemNota>
        )}
        {conviteInfo?.valido && conviteInfo.tipo === 'admin' && (
          <MensagemNota>
            Este link cria uma conta de <strong>administrador</strong>.
          </MensagemNota>
        )}
        {conviteInfo?.valido && conviteInfo.tipo === 'migracao_aluno' && (
          <MensagemNota>
            Ao criares a tua conta, o perfil de aluno de{' '}
            <strong>{conviteInfo.aluno_nome}</strong> passa a ficar ligado a ela.
          </MensagemNota>
        )}

        <CampoTexto id="nome" name="nome" label="Nome" />

        <CampoTexto
          id="telefone"
          name="telefone"
          label="Número de telemóvel"
          type="tel"
          autoComplete="tel"
        />

        <CampoTexto
          id="dataNascimento"
          name="dataNascimento"
          label="Data de nascimento"
          type="date"
          max={hoje}
        />

        <CampoTexto id="email" name="email" label="Email" type="email" />

        <Campo id="password" label="Password">
          <PasswordInput
            id="password"
            name="password"
            minLength={6}
            autoComplete="new-password"
            className={classesCampo}
          />
        </Campo>

        {state?.error && <MensagemErro>{state.error}</MensagemErro>}
        {state?.info && <MensagemInfo>{state.info}</MensagemInfo>}

        <BotaoPrimario disabled={pending}>
          {pending ? 'A criar conta…' : 'Criar conta'}
        </BotaoPrimario>

        <div className="flex flex-col items-center pt-[4px]">
          <LigacaoTerciaria href="/login">Já tens conta? Entrar</LigacaoTerciaria>
        </div>
      </form>
    </Cartao>
  )
}
