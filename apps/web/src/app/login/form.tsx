'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from '@/lib/actions/auth'
import { SimboloCCG } from '@/components/simbolo-ccg'
import { RodapeVitrine } from '@/components/rodape-vitrine'
import { CampoVitrine, PasswordVitrine } from '@/components/campo-vitrine'

// Entrar, na linguagem vitrine (Claude Design, 3a).
//
// A acção principal saiu de dentro do cartão e foi para a cápsula fixa:
// num telemóvel, o fim do formulário fica abaixo do teclado, e o botão
// que estava lá desaparecia justamente quando havia o que submeter.
export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  const searchParams = useSearchParams()
  const erroLink = searchParams.get('erro')

  return (
    <form action={action} className="v-pagina">
      <div className="v-folha">
        <div className="v-topo">
          <Link href="/" className="v-voltar" aria-label="Voltar ao início">
            ‹
          </Link>
          <span className="v-topo-marca" aria-hidden="true">
            <SimboloCCG />
          </span>
        </div>

        <div style={{ padding: '34px 22px 0' }}>
          <p className="v-sobretitulo">Conta CCG</p>
          <h1 className="v-titulo">Entrar</h1>
          <div className="v-traco" />
          <p className="v-entrada">A mesma conta serve para os pais e para os alunos da família.</p>
        </div>

        {(erroLink || state?.error) && <p className="v-erro">{erroLink || state?.error}</p>}

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
          <PasswordVitrine id="password" name="password" />
        </div>

        <div className="v-ligacoes">
          <Link href="/esqueci-password">Esqueceste-te da password?</Link>
          <Link href="/registo">Ainda não tens conta? Criar conta</Link>
        </div>

        <Link href="/instalar" className="v-cartao-linha">
          <i>
            <SimboloCCG />
          </i>
          <div>
            <strong>Levar a aplicação contigo</strong>
            <small>Instalar no telemóvel, sem loja.</small>
          </div>
          <span aria-hidden="true">›</span>
        </Link>

        <RodapeVitrine />
      </div>

      <div className="v-capsula">
        <span className="v-ponto" aria-hidden="true" />
        <strong className="v-capsula-marca">Conta CCG</strong>
        <button type="submit" className="v-capsula-accao" disabled={pending}>
          {pending ? 'A entrar…' : 'Entrar'}
        </button>
      </div>
    </form>
  )
}
