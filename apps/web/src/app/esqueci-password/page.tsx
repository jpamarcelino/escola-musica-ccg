import { FundoPapel } from '@/components/fundo-papel'
import { RodapeLegal } from '@/components/rodape-legal'
import EsqueciPasswordForm from './form'

export default function EsqueciPasswordPage() {
  return (
    <FundoPapel className="auth-pagina">
      <EsqueciPasswordForm />
      <RodapeLegal />
    </FundoPapel>
  )
}
