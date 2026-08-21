'use client'

import { useActionState } from 'react'
import { signup } from '@/lib/actions/auth'
import { PasswordInput } from '@/components/password-input'
import { Cartao } from '@/components/cartao'
import { BotaoPrimario } from '@/components/botao-primario'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { Campo, CampoTexto, classesCampo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo, MensagemNota } from '@/components/mensagem'
import type { ConvitePrograma, ConviteTipo } from '@ccg/types'
import { TEXTOS_LEGAIS } from '@ccg/core'
import Link from 'next/link'

type ConviteInfo = {
  tipo: ConviteTipo
  programa: ConvitePrograma | null
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

        {/* defaultValue em todos: o React 19 limpa o formulário quando
            a acção termina, e sem isto um engano num campo obrigava a
            escrever os seis outra vez. */}
        <CampoTexto id="nome" name="nome" label="Nome" defaultValue={state?.valores?.nome} />

        <CampoTexto
          id="telefone"
          name="telefone"
          label="Número de telemóvel"
          type="tel"
          autoComplete="tel"
          defaultValue={state?.valores?.telefone}
        />

        {/* O NIF vem a seguir ao telefone e antes da data: são os dois
            dados de faturação, e é assim que a pessoa os tem à mão. */}
        <CampoTexto
          id="nif"
          name="nif"
          label="NIF"
          inputMode="numeric"
          maxLength={11}
          autoComplete="off"
          defaultValue={state?.valores?.nif}
        />

        <CampoTexto
          id="email"
          name="email"
          label="Email"
          type="email"
          defaultValue={state?.valores?.email}
        />

        <Campo id="password" label="Password">
          <PasswordInput
            id="password"
            name="password"
            minLength={6}
            autoComplete="new-password"
            className={classesCampo}
          />
        </Campo>

        {/* Duas declarações separadas, ambas desmarcadas.
            Nunca uma checkbox só: juntar Termos, Privacidade, marketing e
            imagem numa caixa faz de todas elas um consentimento inválido —
            não é específico nem informado. E a Política de Privacidade não
            tem checkbox nenhuma: informa-se, não se aceita. */}
        <fieldset className="registo-declaracoes">
          <legend className="sr-only">Declarações</legend>

          <label>
            <input type="checkbox" name="declaraMaioridade" defaultChecked={false} />
            <span>Confirmo que tenho 18 ou mais anos.</span>
          </label>

          <label>
            <input type="checkbox" name="aceitaTermos" defaultChecked={false} />
            <span>
              Li e aceito os{' '}
              <Link href="/legal/termos" target="_blank">
                Termos de Utilização e as Regras do Serviço
              </Link>
              .
            </span>
          </label>

          <p className="registo-nota">
            {TEXTOS_LEGAIS.avisoIdade}
          </p>
          <p className="registo-nota">
            Consulta a{' '}
            <Link href="/legal/privacidade" target="_blank">
              Política de Privacidade
            </Link>{' '}
            para saberes como o Centro Cultural da Guarda utiliza os teus dados.
          </p>
        </fieldset>

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
