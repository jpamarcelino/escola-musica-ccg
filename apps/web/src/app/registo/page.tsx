import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { FundoPapel } from '@/components/fundo-papel'
import RegistoForm from './form'
import type { ConvitePrograma, ConviteTipo } from '@ccg/types'

type ConviteInfo = {
  tipo: ConviteTipo
  programa: ConvitePrograma | null
  aluno_nome: string | null
  valido: boolean
} | null

export default async function RegistoPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string }>
}) {
  const { convite } = await searchParams

  let conviteInfo: ConviteInfo = null
  if (convite) {
    const supabase = await createClient()
    const { data } = await supabase.rpc('validar_convite', { p_codigo: convite })
    conviteInfo = data?.[0] ?? null
  }

  return (
    <FundoPapel className="auth-pagina auth-registo-pagina">
      <Suspense>
        <RegistoForm conviteCodigo={convite ?? null} conviteInfo={conviteInfo} />
      </Suspense>
    </FundoPapel>
  )
}
