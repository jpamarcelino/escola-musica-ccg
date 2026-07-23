import { Suspense } from 'react'
import RegistoForm from './form'

export default function RegistoPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <Suspense>
        <RegistoForm />
      </Suspense>
    </main>
  )
}
