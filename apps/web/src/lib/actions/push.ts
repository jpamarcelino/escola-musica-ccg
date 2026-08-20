'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Guardar e apagar as subscrições de push de quem está com sessão
// iniciada.
//
// Não há nada aqui sobre papéis: a subscrição é da CONTA, e a conta pode
// ser família, professora, da secretaria, ou as três ao mesmo tempo. Um
// sistema por papel obrigava quem acumula papéis a ligar as notificações
// duas vezes — e a recebê-las a dobrar.
//
// A RLS de `push_subscricoes` só deixa cada conta ver e escrever as
// suas. Estas ações não precisam de verificar nada: a base de dados
// recusa sozinha.

export type EstadoPush = { erro?: string; ok?: boolean }

export async function guardarSubscricao(
  _prevState: EstadoPush,
  formData: FormData
): Promise<EstadoPush> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Sessão terminada. Entra outra vez.' }
  }

  const endpoint = String(formData.get('endpoint') ?? '')
  const p256dh = String(formData.get('p256dh') ?? '')
  const auth = String(formData.get('auth') ?? '')
  const descricao = String(formData.get('descricao') ?? '').slice(0, 200)

  if (!endpoint || !p256dh || !auth) {
    return { erro: 'O browser não devolveu uma subscrição válida.' }
  }

  // `upsert` pelo endpoint: o mesmo aparelho a ligar outra vez é o mesmo
  // aparelho. Sem isto, quem ligasse, desligasse e voltasse a ligar
  // ficava com duas linhas e recebia tudo a dobrar.
  //
  // O `user_id` vai no corpo porque um aparelho pode mudar de dono —
  // computador partilhado na secretaria, telemóvel emprestado — e a
  // subscrição tem de passar a apontar para quem lá está agora.
  const { error } = await supabase.from('push_subscricoes').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      descricao: descricao || null,
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    return { erro: 'Não foi possível guardar. Tenta outra vez.' }
  }

  revalidatePath('/dashboard/conta')
  return { ok: true }
}

export async function apagarSubscricao(
  _prevState: EstadoPush,
  formData: FormData
): Promise<EstadoPush> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Sessão terminada. Entra outra vez.' }
  }

  const endpoint = String(formData.get('endpoint') ?? '')
  if (!endpoint) return { erro: 'Subscrição desconhecida.' }

  await supabase.from('push_subscricoes').delete().eq('endpoint', endpoint)

  revalidatePath('/dashboard/conta')
  return { ok: true }
}
