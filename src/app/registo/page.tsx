import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import RegistoForm from './form'

type ConviteInfo = {
  tipo: string
  programa: string | null
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
    <main className="flex-1 flex items-center justify-center p-6">
      <Suspense>
        <RegistoForm conviteCodigo={convite ?? null} conviteInfo={conviteInfo} />
      </Suspense>
    </main>
  )
}
