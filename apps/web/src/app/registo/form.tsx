'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { signup } from '@/lib/actions/auth'
import { SimboloCCG } from '@/components/simbolo-ccg'
import { RodapeVitrine } from '@/components/rodape-vitrine'
import { CampoVitrine, PasswordVitrine, DeclaracaoVitrine } from '@/components/campo-vitrine'
import type { ConvitePrograma, ConviteTipo } from '@ccg/types'
import { TEXTOS_LEGAIS } from '@ccg/core'

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

// Criar Conta CCG, na linguagem vitrine (Claude Design, 3b).
//
// Os seis campos ficam em três secções numeradas — quem és, como entras,
// declarações. Um formulário corrido de seis campos e duas caixas lê-se
// como uma parede; assim há três paragens e sabe-se sempre onde se está.
export default function RegistoForm({
  conviteCodigo,
  conviteInfo,
}: {
  conviteCodigo: string | null
  conviteInfo: ConviteInfo
}) {
  const [state, action, pending] = useActionState(signup, undefined)

  // A cápsula diz quantas declarações faltam, e o botão só acende quando
  // não falta nenhuma. É informação, não bloqueio: quem submeter à mesma
  // continua a receber a validação do servidor, que é a que manda.
  const [maioridade, setMaioridade] = useState(false)
  const [termos, setTermos] = useState(false)
  const faltam = (maioridade ? 0 : 1) + (termos ? 0 : 1)

  const conviteInvalido = conviteCodigo && (!conviteInfo || !conviteInfo.valido)

  return (
    <form action={action} className="v-pagina">
      <div className="v-folha">
        <div className="v-topo">
          <Link href="/login" className="v-voltar" aria-label="Voltar">
            ‹
          </Link>
          <span className="v-topo-marca" aria-hidden="true">
            <SimboloCCG />
          </span>
        </div>

        <div style={{ padding: '30px 22px 0' }}>
          <p className="v-sobretitulo">Conta CCG</p>
          <h1 className="v-titulo">
            Criar
            <br />
            conta
          </h1>
          <div className="v-traco" />
          <p className="v-entrada">
            A conta é do adulto responsável. Os alunos da família acrescentam-se depois.
          </p>
        </div>

        {conviteCodigo && <input type="hidden" name="conviteCodigo" value={conviteCodigo} />}

        {conviteInvalido && (
          <p className="v-erro">
            Este link de convite é inválido ou já foi utilizado. Podes na mesma criar uma conta
            normal abaixo.
          </p>
        )}

        {conviteInfo?.valido && conviteInfo.tipo === 'professor' && (
          <p className="v-aviso">
            Este link cria uma conta de <strong>professor</strong>
            {conviteInfo.programa && ` — Escola de ${PROGRAMA_LABEL[conviteInfo.programa]}`}.
          </p>
        )}
        {conviteInfo?.valido && conviteInfo.tipo === 'admin' && (
          <p className="v-aviso">
            Este link cria uma conta de <strong>administrador</strong>.
          </p>
        )}
        {conviteInfo?.valido && conviteInfo.tipo === 'migracao_aluno' && (
          <p className="v-aviso">
            Ao criares a tua conta, o perfil de aluno de <strong>{conviteInfo.aluno_nome}</strong>{' '}
            passa a ficar ligado a ela.
          </p>
        )}

        <section className="v-seccao-campos">
          <p className="v-sobretitulo">01 Quem és</p>
          {/* defaultValue em todos: o React 19 limpa o formulário quando
              a acção termina, e sem isto um engano num campo obrigava a
              escrever os seis outra vez. */}
          <div className="v-campos v-campos-secas">
            <CampoVitrine
              id="nome"
              name="nome"
              label="Nome"
              placeholder="Nome completo"
              autoComplete="name"
              defaultValue={state?.valores?.nome}
              required
            />
            <div className="v-campo-par">
              <CampoVitrine
                id="telefone"
                name="telefone"
                label="Telemóvel"
                type="tel"
                autoComplete="tel"
                placeholder="9xx xxx xxx"
                defaultValue={state?.valores?.telefone}
                required
              />
              <CampoVitrine
                id="nif"
                name="nif"
                label="NIF"
                inputMode="numeric"
                maxLength={11}
                autoComplete="off"
                placeholder="000 000 000"
                defaultValue={state?.valores?.nif}
                required
              />
            </div>
            <p className="v-campo-ajuda">O NIF serve só para as facturas das mensalidades.</p>
          </div>
        </section>

        <section className="v-seccao-campos">
          <p className="v-sobretitulo">02 Como entras</p>
          <div className="v-campos v-campos-secas">
            <CampoVitrine
              id="email"
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="nome@exemplo.pt"
              defaultValue={state?.valores?.email}
              required
            />
            <PasswordVitrine
              id="password"
              name="password"
              autoComplete="new-password"
              ajuda="Pelo menos 6 caracteres."
            />
          </div>
        </section>

        <section className="v-seccao-campos">
          <p className="v-sobretitulo">03 Declarações</p>
          {/* Duas declarações separadas, ambas desmarcadas. Nunca uma
              checkbox só: juntar Termos, Privacidade, marketing e imagem
              numa caixa faz de todas elas um consentimento inválido — não
              é específico nem informado. E a Política de Privacidade não
              tem checkbox nenhuma: informa-se, não se aceita. */}
          <div className="v-declaracoes">
            <DeclaracaoVitrine name="declaraMaioridade" onChange={setMaioridade}>
              Confirmo que tenho 18 ou mais anos.
            </DeclaracaoVitrine>
            <DeclaracaoVitrine name="aceitaTermos" onChange={setTermos}>
              Li e aceito os{' '}
              <Link href="/legal/termos" target="_blank">
                Termos de Utilização e as Regras do Serviço
              </Link>
              .
            </DeclaracaoVitrine>
          </div>
          <p className="v-nota">{TEXTOS_LEGAIS.avisoIdade}</p>
          <p className="v-nota">
            Consulta a{' '}
            <Link href="/legal/privacidade" target="_blank">
              Política de Privacidade
            </Link>{' '}
            para saberes como o Centro Cultural da Guarda utiliza os teus dados.
          </p>
        </section>

        {state?.error && <p className="v-erro">{state.error}</p>}
        {state?.info && <p className="v-aviso">{state.info}</p>}

        <div className="v-ligacoes">
          <Link href="/login">Já tens conta? Entrar</Link>
        </div>

        <RodapeVitrine />
      </div>

      <div className="v-capsula">
        <span className="v-capsula-texto">
          <small>
            {faltam === 0
              ? 'Tudo pronto'
              : faltam === 1
                ? 'Falta 1 declaração'
                : `Faltam ${faltam} declarações`}
          </small>
          <strong>Criar conta</strong>
        </span>
        <button
          type="submit"
          className="v-capsula-accao"
          disabled={pending}
          aria-disabled={faltam > 0 ? 'true' : undefined}
        >
          {pending ? 'A criar…' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
