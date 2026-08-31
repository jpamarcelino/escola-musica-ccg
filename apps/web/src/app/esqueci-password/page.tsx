'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { pedirRecuperacaoPassword } from '@/lib/actions/auth'
import { SimboloCCG } from '@/components/simbolo-ccg'
import { RodapeVitrine } from '@/components/rodape-vitrine'
import { CampoVitrine } from '@/components/campo-vitrine'

// Recuperar password. Não foi desenhada no Claude Design — não havia
// nada para decidir — mas fala a mesma língua dos outros ecrãs de conta:
// se ficasse na linguagem antiga, o percurso "não me lembro da password"
// atravessava duas aplicações diferentes.
export default function EsqueciPasswordPage() {
  const [state, action, pending] = useActionState(pedirRecuperacaoPassword, undefined)

  return (
    <form action={action} className="v-pagina">
      <div className="v-folha">
        <div className="v-topo">
          <Link href="/login" className="v-voltar" aria-label="Voltar a entrar">
            ‹
          </Link>
          <span className="v-topo-marca" aria-hidden="true">
            <SimboloCCG />
          </span>
        </div>

        <div style={{ padding: '34px 22px 0' }}>
          <p className="v-sobretitulo">Conta CCG</p>
          <h1 className="v-titulo">
            Recuperar
            <br />
            password
          </h1>
          <div className="v-traco" />
          <p className="v-entrada">
            Escreve o teu email e enviamos-te um link para definires uma nova.
          </p>
        </div>

        <div className="v-campos">
          <CampoVitrine
            id="email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="nome@exemplo.pt"
            required
          />
        </div>

        {state?.error && <p className="v-erro">{state.error}</p>}
        {state?.info && <p className="v-aviso">{state.info}</p>}

        <div className="v-ligacoes">
          <Link href="/login">Voltar a entrar</Link>
        </div>

        <RodapeVitrine />
      </div>

      <div className="v-capsula">
        <span className="v-ponto" aria-hidden="true" />
        <strong className="v-capsula-marca">Conta CCG</strong>
        <button type="submit" className="v-capsula-accao" disabled={pending}>
          {pending ? 'A enviar…' : 'Enviar link'}
        </button>
      </div>
    </form>
  )
}
