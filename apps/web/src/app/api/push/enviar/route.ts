import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// O endpoint que a base de dados chama quando nasce um aviso com push.
//
// Quem chama é o gatilho `notificacoes_enviam_push`, via pg_net, com o
// segredo no cabeçalho — não há sessão de utilizador nenhuma, tal como no
// endpoint do cron. E tal como lá, o trabalho privilegiado (ler o aviso
// de outra pessoa, ler as subscrições dela) mora em funções
// `security definer`: a chave de service role não entra na app.
//
// O envio acontece aqui e nunca no cliente. A chave privada VAPID é o
// que prova à Google e à Apple que a push vem desta escola; sair daqui
// era entregá-la a quem abrisse as ferramentas do browser.

// Node e não Edge: a biblioteca de web push assina com criptografia que
// o runtime de Edge não tem.
export const runtime = 'nodejs'

type Destino = {
  endpoint: string
  p256dh: string
  auth: string
  titulo: string
  corpo: string
  url: string
}

export async function POST(request: NextRequest) {
  const segredo = process.env.PUSH_SEGREDO
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  const contacto = process.env.VAPID_CONTACTO ?? 'mailto:geral@ccg.pt'

  if (!segredo || request.headers.get('x-push-segredo') !== segredo) {
    return NextResponse.json({ erro: 'Nao autorizado.' }, { status: 401 })
  }

  if (!publica || !privada) {
    // Sem chaves não há envio — mas isto não é erro do lado de quem
    // chamou, e o aviso dentro da app já existe.
    return NextResponse.json({ enviadas: 0, motivo: 'sem-chaves' })
  }

  const { notificacaoId } = (await request.json().catch(() => ({}))) as {
    notificacaoId?: number
  }

  if (!notificacaoId) {
    return NextResponse.json({ erro: 'Falta o aviso.' }, { status: 400 })
  }

  webpush.setVapidDetails(contacto, publica, privada)

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('push_destinos', {
    p_segredo: segredo,
    p_notificacao_id: notificacaoId,
  })

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  const destinos = (data ?? []) as Destino[]

  // Todos os dispositivos da conta ao mesmo tempo. Um telemóvel que
  // falhe não pode impedir o tablet de receber.
  const resultados = await Promise.allSettled(
    destinos.map(async (d) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: d.endpoint,
            keys: { p256dh: d.p256dh, auth: d.auth },
          },
          JSON.stringify({
            titulo: d.titulo,
            corpo: d.corpo,
            url: d.url,
            tag: `aviso-${notificacaoId}`,
          })
        )

        await supabase.rpc('push_registar_uso', {
          p_segredo: segredo,
          p_endpoint: d.endpoint,
        })

        return 'enviada'
      } catch (erro) {
        const estado = (erro as { statusCode?: number }).statusCode

        // 404/410: o browser já não conhece esta subscrição — a app foi
        // desinstalada, ou os dados apagados. Fica a falhar para sempre
        // se não sair da tabela.
        if (estado === 404 || estado === 410) {
          await supabase.rpc('push_remover_subscricao', {
            p_segredo: segredo,
            p_endpoint: d.endpoint,
          })
          return 'removida'
        }

        throw erro
      }
    })
  )

  const enviadas = resultados.filter(
    (r) => r.status === 'fulfilled' && r.value === 'enviada'
  ).length
  const removidas = resultados.filter(
    (r) => r.status === 'fulfilled' && r.value === 'removida'
  ).length
  const falhadas = resultados.filter((r) => r.status === 'rejected').length

  // Devolve 200 mesmo com falhas: quem chamou foi um gatilho da base de
  // dados, e não há nada que ele possa fazer com um erro. O aviso dentro
  // da app está criado, que é o que interessa.
  return NextResponse.json({ enviadas, removidas, falhadas })
}
