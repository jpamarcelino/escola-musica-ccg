import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { destinoSeguro } from '@/lib/auth/destino-seguro'

// Onde aterra quem clica no link do email.
//
// Aceita os dois formatos de propósito, e não por indecisão:
//
//   ?code=…                        o que o modelo predefinido gera hoje
//   ?token_hash=…&type=recovery    o que passa a gerar quando os modelos
//                                  forem editados
//
// Sem os dois, a app partia no intervalo entre publicar isto e alguém
// mexer nos modelos do Supabase — e esse intervalo pode ser semanas.
//
// O segundo formato existe porque o primeiro tem uma fragilidade
// conhecida: o token é de uso único e há filtros de spam e
// pré-visualizadores de email que VISITAM o link antes da pessoa. Quando
// ela chega, o token já foi gasto, e lê "link inválido" num link em que
// nunca tinha tocado. O `verifyOtp` com `token_hash` aguenta isso.

const TIPOS_VALIDOS: EmailOtpType[] = [
  'email',
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
]

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const tipo = searchParams.get('type')
  const next = destinoSeguro(searchParams.get('next'))

  const supabase = await createClient()

  if (tokenHash && tipo && TIPOS_VALIDOS.includes(tipo as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: tipo as EmailOtpType,
      token_hash: tokenHash,
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Falhou. Quem vinha repor a password vai para onde pode pedir outro
  // email, e não para o login — dizer "o link expirou" a quem não sabe a
  // password e pô-lo em frente a um campo de password é um beco.
  if (tipo === 'recovery' || next.startsWith('/redefinir-password')) {
    return NextResponse.redirect(
      `${origin}/esqueci-password?erro=${encodeURIComponent(
        'O link expirou ou já tinha sido usado. Pede outro código.'
      )}`
    )
  }

  return NextResponse.redirect(
    `${origin}/login?erro=${encodeURIComponent('Link inválido ou expirado.')}`
  )
}
