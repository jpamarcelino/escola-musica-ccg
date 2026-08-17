import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RedefinirPasswordForm from './form'

export default async function RedefinirPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/esqueci-password')
  }

  return (
    <main id="conteudo-principal" className="auth-pagina flex-1 flex items-center justify-center p-6">
      <div className="auth-cartao w-full max-w-sm"><RedefinirPasswordForm /></div>
    </main>
  )
}
