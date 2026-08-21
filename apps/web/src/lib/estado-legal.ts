import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type EstadoLegal = {
  termosVersao: string | null
  termosPorAceitar: boolean
  termosResumo: string | null
  privacidadeVersao: string | null
  privacidadePorVer: boolean
}

const VAZIO: EstadoLegal = {
  termosVersao: null,
  termosPorAceitar: false,
  termosResumo: null,
  privacidadeVersao: null,
  privacidadePorVer: false,
}

// O que falta a quem entrou: Termos por aceitar (bloqueia) e Política por
// ver (não bloqueia).
//
// Em `cache` porque o layout pergunta uma vez por render e a página pode
// voltar a perguntar no mesmo pedido.
//
// Se a consulta falhar, devolve-se VAZIO — ou seja, não bloqueia. É
// deliberado: uma falha de rede não pode trancar a app a toda a gente. O
// pior caso é alguém passar um dia sem ver o ecrã de aceitação; o pior
// caso do contrário é ninguém conseguir entrar.
export const getEstadoLegal = cache(async (): Promise<EstadoLegal> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return VAZIO

  const { data, error } = await supabase.rpc('estado_legal_da_conta')

  if (error || !data || (data as unknown[]).length === 0) return VAZIO

  const linha = (data as {
    termos_versao: string | null
    termos_por_aceitar: boolean
    termos_resumo: string | null
    privacidade_versao: string | null
    privacidade_por_ver: boolean
  }[])[0]

  return {
    termosVersao: linha.termos_versao,
    termosPorAceitar: Boolean(linha.termos_por_aceitar),
    termosResumo: linha.termos_resumo,
    privacidadeVersao: linha.privacidade_versao,
    privacidadePorVer: Boolean(linha.privacidade_por_ver),
  }
})
