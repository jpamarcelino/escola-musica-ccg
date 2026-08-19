import { cache } from 'react'
import { contarNotificacoesPorLer } from '@ccg/data'
import { createClient } from '@/lib/supabase/server'
import type { PerfisEscolaPrograma, PerfisEscolaTipo } from '@ccg/types'

// React mantém este resultado apenas durante o render atual. Layout e página
// partilham assim a mesma validação remota sem guardar sessões entre pedidos.
export const getAuthContext = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
})

// Quantos avisos esperam por quem entrou. Em `cache` pela mesma razão
// das outras: o layout pede-a e a página pode voltar a pedi-la no mesmo
// pedido, e não vale a pena contar duas vezes.
export const getAvisosPorLer = cache(async () => {
  const { supabase, user } = await getAuthContext()
  if (!user) return 0
  return contarNotificacoesPorLer(supabase, user.id)
})

export type SchoolProfile = {
  nome: string
  tipo: PerfisEscolaTipo | undefined
  admin: boolean | undefined
  programa: PerfisEscolaPrograma | null | undefined
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

  // Esta é a fronteira onde os dados do Supabase entram sem tipo. Estreitar
  // aqui, e não mais à frente, é o que faz valer a pena: a partir deste
  // ponto o `tipo` já não é uma string qualquer, e comparar com um valor
  // inexistente passa a ser erro de compilação. Os valores são garantidos
  // pela constraint CHECK da tabela — é dela que estas uniões saem.
  const row = data as {
    nome: string
    perfis_escola: {
      tipo: PerfisEscolaTipo
      admin: boolean
      programa: PerfisEscolaPrograma | null
    } | null
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
