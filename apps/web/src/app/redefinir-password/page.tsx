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

  // O fundo e o rodapé vivem dentro do formulário, como nos restantes
  // ecrãs vitrine.
  return <RedefinirPasswordForm />
}
