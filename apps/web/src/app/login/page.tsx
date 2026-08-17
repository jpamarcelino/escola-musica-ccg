import { Suspense } from 'react'
import { FundoPapel } from '@/components/fundo-papel'
import LoginForm from './form'

export default function LoginPage() {
  return (
    <FundoPapel className="auth-pagina">
      <Suspense>
        <LoginForm />
      </Suspense>
    </FundoPapel>
  )
}
