import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// React mantém este resultado apenas durante o render atual. Layout e página
// partilham assim a mesma validação remota sem guardar sessões entre pedidos.
export const getAuthContext = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
})

export type SchoolProfile = {
  nome: string
  tipo: string | undefined
  admin: boolean | undefined
  programa: string | null | undefined
}

// Layout e página são renderizados no mesmo pedido. Esta função evita que
// ambos repitam a consulta de perfil que decide navegação, permissões e cópia.
export const getSchoolProfileContext = cache(async () => {
  const { supabase, user } = await getAuthContext()
  if (!user) return { supabase, user, profile: null as SchoolProfile | null }

  const { data } = await supabase
    .from('profiles')
    .select('nome, perfis_escola(tipo, admin, programa)')
    .eq('id', user.id)
    .single()

  const row = data as {
    nome: string
    perfis_escola: { tipo: string; admin: boolean; programa: string | null } | null
  } | null

  const profile: SchoolProfile | null = row
    ? {
        nome: row.nome,
        tipo: row.perfis_escola?.tipo,
        admin: row.perfis_escola?.admin,
        programa: row.perfis_escola?.programa,
      }
    : null

  return { supabase, user, profile }
})
