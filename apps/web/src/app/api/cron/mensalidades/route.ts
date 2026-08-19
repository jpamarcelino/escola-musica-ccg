import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Corre todos os dias (ver vercel.json). As próprias funções na base de
// dados só fazem alguma coisa nos dias 1 e 20 — aqui só se protege o
// endpoint contra chamadas de fora do Vercel Cron.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const autorizacao = request.headers.get('authorization')

  if (!cronSecret || autorizacao !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = await createClient()

  // `tratar_pedidos_reposicao` corre todos os dias e é ela que expira os
  // pedidos aos 30 dias e envia os lembretes ao professor aos 7, 21 e 28.
  // Entra aqui e não num cron próprio porque o Vercel Hobby só permite um
  // agendamento — e porque estas quatro são todas "o que a escola faz
  // sozinha à noite".
  const [
    { error: erroMensalidades },
    { error: erroAvisos },
    { error: erroExpirar },
    { error: erroReposicoes },
  ] = await Promise.all([
    supabase.rpc('gerar_mensalidades_e_avisos'),
    supabase.rpc('avisar_pagamentos_em_falta'),
    supabase.rpc('expirar_beneficios_ano_letivo'),
    supabase.rpc('tratar_pedidos_reposicao'),
  ])

  if (erroMensalidades || erroAvisos || erroExpirar || erroReposicoes) {
    return NextResponse.json(
      {
        erro: 'Falhou a gerar mensalidades, avisos, a expirar benefícios ou a tratar reposições.',
        erroMensalidades,
        erroAvisos,
        erroExpirar,
        erroReposicoes,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
