import { Suspense } from 'react'
import LoginForm from './form'

// O rodapé legal e o fundo vivem agora dentro do formulário: no design
// vitrine a página inteira é uma folha de papel com uma cápsula fixa por
// cima, e não um cartão pousado sobre um fundo.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
