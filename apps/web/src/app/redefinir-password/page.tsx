import { redirect } from 'next/navigation'
import { FundoPapel } from '@/components/fundo-papel'
import { RodapeLegal } from '@/components/rodape-legal'
import { createClient } from '@/lib/supabase/server'
import { emailPorConfirmar } from '@/lib/actions/auth'
import RedefinirPasswordForm from './form'

export default async function RedefinirPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = await emailPorConfirmar()

  // Antes esta página exigia sessão e, sem ela, mandava a pessoa de volta
  // para o princípio. Só se chegava aqui pelo link do email — e era por
  // isso que nunca se conseguia ver o ecrã sem passar por um email real.
  //
  // Agora há duas maneiras de cá estar: com sessão (veio do link) ou com
  // um pedido de recuperação acabado de fazer (escreve o código). Sem
  // nenhuma das duas é que não há nada a fazer nesta página.
  if (!user && !email) {
    redirect('/esqueci-password')
  }

  return (
    <FundoPapel className="auth-pagina">
      <RedefinirPasswordForm temSessao={Boolean(user)} email={email} />
      <RodapeLegal />
    </FundoPapel>
  )
}
