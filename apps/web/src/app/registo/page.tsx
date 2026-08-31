import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
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

  // O rodapé e o fundo vivem dentro do formulário: no design vitrine a
  // página é uma folha inteira com uma cápsula fixa por cima.
  return (
    <Suspense>
      <RegistoForm conviteCodigo={convite ?? null} conviteInfo={conviteInfo} />
    </Suspense>
  )
}
