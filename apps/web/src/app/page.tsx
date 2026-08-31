import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicHomeExperience } from '@/components/public-home-experience'

// As três escolas. A cor tinge o fundo da caixa de ícone do cartão (na
// v1 era uma barra de 3px ao lado, que ninguém lia); o href entra no
// wizard já com a escola escolhida, pelo que o passo de escolher escola
// é saltado — a idade é pedida logo a seguir, em pop-up.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  // O rodapé legal passou para dentro da experiência: no design
  // vitrine ele vive acima da cápsula fixa, e não depois do <main>.
  return <PublicHomeExperience />
}
