'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function definirValorMensal(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = String(formData.get('matriculaId') ?? '')
  const valorTexto = String(formData.get('valor') ?? '').replace(',', '.')
  const valor = valorTexto === '' ? null : Number(valorTexto)

  if (valor !== null && (Number.isNaN(valor) || valor < 0)) {
    redirect('/admin/pagamentos?erro=' + encodeURIComponent('Valor inválido.'))
  }

  await supabase
    .from('matriculas')
    .update({ valor_mensal: valor })
    .eq('id', matriculaId)

  revalidatePath('/admin/pagamentos')
}

export async function marcarMensalidadePaga(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = Number(formData.get('matriculaId') ?? 0)
  const ano = Number(formData.get('ano') ?? 0)
  const mes = Number(formData.get('mes') ?? 0)
  const valor = Number(formData.get('valor') ?? 0)
  const pago = String(formData.get('pago') ?? '') === 'true'
  const numeroFatura = String(formData.get('numeroFatura') ?? '').trim() || null

  await supabase.from('mensalidades').upsert(
    {
      matricula_id: matriculaId,
      ano,
      mes,
      valor,
      pago,
      pago_em: pago ? new Date().toISOString() : null,
      marcado_por: user.id,
      numero_fatura: numeroFatura,
    },
    { onConflict: 'matricula_id,ano,mes' }
  )

  revalidatePath('/admin/pagamentos')
}

export async function definirNumeroFatura(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = Number(formData.get('matriculaId') ?? 0)
  const ano = Number(formData.get('ano') ?? 0)
  const mes = Number(formData.get('mes') ?? 0)
  const valor = Number(formData.get('valor') ?? 0)
  const pago = String(formData.get('pago') ?? '') === 'true'
  const numeroFatura = String(formData.get('numeroFatura') ?? '').trim() || null

  await supabase.from('mensalidades').upsert(
    {
      matricula_id: matriculaId,
      ano,
      mes,
      valor,
      pago,
      numero_fatura: numeroFatura,
    },
    { onConflict: 'matricula_id,ano,mes' }
  )

  revalidatePath('/admin/pagamentos')
}
