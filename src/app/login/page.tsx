import { Suspense } from 'react'
import LoginForm from './form'

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
