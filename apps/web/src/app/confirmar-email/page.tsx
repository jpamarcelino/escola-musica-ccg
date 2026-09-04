import { redirect } from 'next/navigation'
import { FundoPapel } from '@/components/fundo-papel'
import { RodapeLegal } from '@/components/rodape-legal'
import { createClient } from '@/lib/supabase/server'
import { emailPorConfirmar } from '@/lib/actions/auth'
import ConfirmarEmailForm from './form'

// O passo entre criar a conta e entrar nela.
//
// Página própria e não um passo dentro do /registo: entre receber o email
// e escrever o código, muita gente sai da app, abre o correio e volta —
// e às vezes volta noutro separador. Num estado guardado em React isso
// perdia o formulário todo; numa rota, escreve-se a morada e continua-se
// de onde se estava.
export default async function ConfirmarEmailPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Já entrou (confirmou noutro separador, ou clicou no link do email):
  // não há nada a confirmar aqui.
  if (user) {
    redirect('/dashboard')
  }

  const email = await emailPorConfirmar()

  return (
    <FundoPapel className="auth-pagina">
      <ConfirmarEmailForm email={email} />
      <RodapeLegal />
    </FundoPapel>
  )
}
