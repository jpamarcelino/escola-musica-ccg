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

  const [{ error: erroMensalidades }, { error: erroAvisos }] = await Promise.all([
    supabase.rpc('gerar_mensalidades_e_avisos'),
    supabase.rpc('avisar_pagamentos_em_falta'),
  ])

  if (erroMensalidades || erroAvisos) {
    return NextResponse.json(
      { erro: 'Falhou a gerar mensalidades ou avisos.', erroMensalidades, erroAvisos },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
