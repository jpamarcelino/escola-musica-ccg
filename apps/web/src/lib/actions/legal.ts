'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Registar a aceitação dos Termos de quem já tinha conta.
//
// A versão vem da base dentro da função `registar_aceitacao` (0052) — o
// formulário não a envia, e não podia: prova de aceitação de uma versão
// escolhida pelo cliente não prova nada.
export async function aceitarTermos(): Promise<{ erro?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { erro: 'Sessão expirada. Entra outra vez.' }

  const { data: doc } = await supabase
    .from('documentos_legais')
    .select('versao')
    .eq('tipo', 'termos')
    .eq('ativo', true)
    .maybeSingle()

  if (!doc?.versao) return { erro: 'Não há Termos publicados. Contacta a secretaria.' }

  const { error } = await supabase.rpc('registar_aceitacao', {
    p_tipo: 'termos',
    p_versao: doc.versao,
    p_accao: 'aceite',
    p_origem: 'web',
  })

  if (error) return { erro: error.message }

  revalidatePath('/', 'layout')
  return {}
}

// A Política de Privacidade não se aceita — vê-se.
//
// `accao: 'visto'` e não 'aceite', de propósito: daqui a dois anos
// ninguém vai poder apresentar isto como se fosse consentimento. É o
// registo de que o aviso foi apresentado e fechado, e mais nada.
export async function marcarPrivacidadeVista(): Promise<{ erro?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { erro: 'Sessão expirada.' }

  const { data: doc } = await supabase
    .from('documentos_legais')
    .select('versao')
    .eq('tipo', 'privacidade')
    .eq('ativo', true)
    .maybeSingle()

  if (!doc?.versao) return {}

  await supabase.rpc('registar_aceitacao', {
    p_tipo: 'privacidade',
    p_versao: doc.versao,
    p_accao: 'visto',
    p_origem: 'web',
  })

  revalidatePath('/', 'layout')
  return {}
}
