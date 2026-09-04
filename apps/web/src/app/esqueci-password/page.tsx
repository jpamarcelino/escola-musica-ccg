import { Suspense } from 'react'
import { FundoPapel } from '@/components/fundo-papel'
import { RodapeLegal } from '@/components/rodape-legal'
import EsqueciPasswordForm from './form'

export default function EsqueciPasswordPage() {
  return (
    <FundoPapel className="auth-pagina">
      {/* O formulário lê a morada (para o motivo de um link falhado) e
          isso obriga a uma fronteira de Suspense, como no /login. */}
      <Suspense>
        <EsqueciPasswordForm />
      </Suspense>
      <RodapeLegal />
    </FundoPapel>
  )
}
