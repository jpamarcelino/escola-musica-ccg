'use client'

import { useActionState } from 'react'
import { atualizarPassword } from '@/lib/actions/auth'
import { SimboloCCG } from '@/components/simbolo-ccg'
import { RodapeVitrine } from '@/components/rodape-vitrine'
import { PasswordVitrine } from '@/components/campo-vitrine'

// O fim do percurso de recuperação. Sem seta de voltar: chega-se aqui
// por um link de email com uma sessão de recuperação, e voltar atrás não
// leva a lado nenhum útil — leva a pedir outro link.
export default function RedefinirPasswordForm() {
  const [state, action, pending] = useActionState(atualizarPassword, undefined)

  return (
    <form action={action} className="v-pagina">
      <div className="v-folha">
        <div className="v-topo">
          <span />
          <span className="v-topo-marca" aria-hidden="true">
            <SimboloCCG />
          </span>
        </div>

        <div style={{ padding: '34px 22px 0' }}>
          <p className="v-sobretitulo">Conta CCG</p>
          <h1 className="v-titulo">
            Nova
            <br />
            password
          </h1>
          <div className="v-traco" />
          <p className="v-entrada">Escolhe uma password nova para esta conta.</p>
        </div>

        <div className="v-campos">
          <PasswordVitrine
            id="password"
            name="password"
            label="Nova password"
            autoComplete="new-password"
            ajuda="Pelo menos 6 caracteres."
          />
        </div>

        {state?.error && <p className="v-erro">{state.error}</p>}

        <RodapeVitrine />
      </div>

      <div className="v-capsula">
        <span className="v-ponto" aria-hidden="true" />
        <strong className="v-capsula-marca">Conta CCG</strong>
        <button type="submit" className="v-capsula-accao" disabled={pending}>
          {pending ? 'A guardar…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
