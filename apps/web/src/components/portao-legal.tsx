'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { TEXTOS_LEGAIS, CCG_CONTACTO } from '@/lib/legal-cliente'
import { aceitarTermos, marcarPrivacidadeVista } from '@/lib/actions/legal'
import { logout } from '@/lib/actions/auth'

// O ecrã de Termos atualizados, para quem já tinha conta.
//
// Bloqueia a app, mas NÃO é um beco sem saída — e essa distinção é o que
// separa um pedido legítimo de uma coação. Quem não quiser aceitar tem,
// no mesmo ecrã: o resumo do que mudou, a versão completa, o contacto do
// CCG, a porta para gerir/encerrar a conta e o botão de sair. Um ecrã que
// só oferecesse "Aceitar" tornaria a aceitação não-livre, e uma aceitação
// não-livre não vale nada.
export function PortaoTermos({
  versao,
  resumo,
}: {
  versao: string
  resumo: string | null
}) {
  const [aPensar, comecar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  return (
    <div className="portao-legal" role="dialog" aria-modal="true" aria-labelledby="portao-titulo">
      <div className="portao-legal-caixa">
        <p className="partitura-sobretitulo">Termos de Utilização · versão {versao}</p>
        <h1 id="portao-titulo">Atualizámos os Termos</h1>
        <p className="portao-legal-texto">{TEXTOS_LEGAIS.termosAtualizados}</p>

        {resumo && (
          <div className="portao-legal-resumo">
            <h2>O que mudou</h2>
            <p>{resumo}</p>
          </div>
        )}

        <div className="portao-legal-accoes">
          <Link href="/legal/termos" target="_blank" className="portao-legal-ler">
            Ler os Termos completos
          </Link>

          <button
            type="button"
            className="portao-legal-aceitar"
            disabled={aPensar}
            onClick={() =>
              comecar(async () => {
                const r = await aceitarTermos()
                if (r.erro) setErro(r.erro)
              })
            }
          >
            {aPensar ? 'A guardar…' : 'Aceitar e continuar'}
          </button>
        </div>

        {erro && <p className="portao-legal-erro">{erro}</p>}

        <div className="portao-legal-saidas">
          <Link href="/dashboard/conta/avancado">Gerir ou encerrar a conta</Link>
          <a href={`mailto:${CCG_CONTACTO.email}`}>Falar com o CCG</a>
          <form action={logout}>
            <button type="submit">Sair</button>
          </form>
        </div>
      </div>
    </div>
  )
}

// A Política de Privacidade atualizada. Avisa, não bloqueia, e nunca diz
// "Aceito" — só há dois botões, "Ver política" e "Fechar", exatamente
// como o documento manda.
export function AvisoPrivacidade({ versao }: { versao: string }) {
  const [fechado, setFechado] = useState(false)
  const [, comecar] = useTransition()

  if (fechado) return null

  return (
    <div className="aviso-privacidade" role="status">
      <p>
        <strong>Política de Privacidade atualizada (versão {versao}).</strong>{' '}
        {TEXTOS_LEGAIS.privacidadeAtualizada}
      </p>
      <div>
        <Link href="/legal/privacidade">Ver política</Link>
        <button
          type="button"
          onClick={() => {
            setFechado(true)
            comecar(async () => {
              await marcarPrivacidadeVista()
            })
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
