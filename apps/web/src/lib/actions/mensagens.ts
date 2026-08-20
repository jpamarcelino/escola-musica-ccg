'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Enviar uma mensagem escrita à mão para muita gente de uma vez.
//
// A ação quase não decide nada: quem decide é `enviar_mensagem_escola`
// (migração 0042), porque é lá que se sabe quem tem matrícula com quem.
// Aqui só se lê o formulário e se traduz o erro da base de dados para
// uma frase que se possa ler em português.
//
// Não redireciona no sucesso, ao contrário da maior parte das ações
// deste projeto: quem acabou de escrever a mensagem quer ver "enviada a
// 34 pessoas" no sítio onde estava, e não uma página nova.

export type EstadoMensagem = { erro?: string; enviadas?: number }

export async function enviarMensagem(
  _prevState: EstadoMensagem,
  formData: FormData
): Promise<EstadoMensagem> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Sessão terminada. Entra outra vez.' }
  }

  const publico = String(formData.get('publico') ?? 'alunos')
  const filtro = String(formData.get('filtro') ?? 'todos')
  const corpo = String(formData.get('corpo') ?? '').trim()

  // A caixa "sem nome" é uma checkbox: marcada, a assinatura não vai —
  // e o `null` faz a base de dados escrever "Mensagem da escola".
  const semNome = formData.get('semNome') === 'on'
  const assinatura = semNome ? null : String(formData.get('assinatura') ?? '').trim() || null

  const professores = formData.getAll('professores').map(String).filter(Boolean)
  const alunos = formData.getAll('alunos').map(String).filter(Boolean)
  const programa = String(formData.get('programa') ?? '') || null

  if (!corpo) {
    return { erro: 'Escreve a mensagem.' }
  }

  const { data, error } = await supabase.rpc('enviar_mensagem_escola', {
    p_corpo: corpo,
    p_publico: publico,
    p_filtro: filtro,
    p_assinatura: assinatura,
    p_professores: professores.length > 0 ? professores : null,
    p_programa: programa,
    p_alunos: alunos.length > 0 ? alunos : null,
  })

  if (error) {
    return { erro: error.message }
  }

  const enviadas = Number(data ?? 0)

  revalidatePath('/admin/mensagens')
  revalidatePath('/dashboard/mensagens')

  // Zero não é erro — é o alvo estar vazio (um professor sem alunos
  // confirmados, uma escola sem matrículas). Vale mais dizê-lo do que
  // deixar a pessoa a pensar que a mensagem saiu.
  return { enviadas }
}
