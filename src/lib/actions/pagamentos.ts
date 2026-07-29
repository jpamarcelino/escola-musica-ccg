'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MESES_ANO_LETIVO } from '@/lib/ano-letivo'

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
  const alunoId = String(formData.get('alunoId') ?? '')
  const professorId = String(formData.get('professorId') ?? '')
  const instrumentoNome = String(formData.get('instrumentoNome') ?? '') || null
  const ano = Number(formData.get('ano') ?? 0)
  const mes = Number(formData.get('mes') ?? 0)
  const valor = Number(formData.get('valor') ?? 0)
  const pago = String(formData.get('pago') ?? '') === 'true'
  const numeroFatura = String(formData.get('numeroFatura') ?? '').trim() || null

  await supabase.from('mensalidades').upsert(
    {
      matricula_id: matriculaId,
      aluno_id: alunoId,
      professor_id: professorId,
      instrumento_nome: instrumentoNome,
      ano,
      mes,
      valor,
      pago,
      pago_em: pago ? new Date().toISOString() : null,
      marcado_por: user.id,
      numero_fatura: numeroFatura,
    },
    { onConflict: 'aluno_id,professor_id,ano,mes' }
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
  const alunoId = String(formData.get('alunoId') ?? '')
  const professorId = String(formData.get('professorId') ?? '')
  const instrumentoNome = String(formData.get('instrumentoNome') ?? '') || null
  const ano = Number(formData.get('ano') ?? 0)
  const mes = Number(formData.get('mes') ?? 0)
  const valor = Number(formData.get('valor') ?? 0)
  const pago = String(formData.get('pago') ?? '') === 'true'
  const numeroFatura = String(formData.get('numeroFatura') ?? '').trim() || null

  await supabase.from('mensalidades').upsert(
    {
      matricula_id: matriculaId,
      aluno_id: alunoId,
      professor_id: professorId,
      instrumento_nome: instrumentoNome,
      ano,
      mes,
      valor,
      pago,
      numero_fatura: numeroFatura,
    },
    { onConflict: 'aluno_id,professor_id,ano,mes' }
  )

  revalidatePath('/admin/pagamentos')
}

// Edição em massa da tabela de histórico (um professor, todos os meses do
// ano letivo, todos os alunos que já lá apareceram). Célula em branco =
// apaga o registo desse mês (o que faz o aluno voltar a aparecer em
// "por confirmar" se for o mês atual); célula preenchida = grava.
export async function atualizarHistoricoMensalidades(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const professorId = String(formData.get('professorId') ?? '')
  const alunoIds = formData.getAll('alunoIds').map(String)

  const paraGuardar: {
    aluno_id: string
    professor_id: string
    ano: number
    mes: number
    valor: number
    numero_fatura: string | null
    pago: boolean
    pago_em: string
    marcado_por: string
  }[] = []

  for (const alunoId of alunoIds) {
    for (const { ano, mes } of MESES_ANO_LETIVO) {
      const valorTexto = String(formData.get(`v_${alunoId}_${ano}_${mes}`) ?? '')
        .trim()
        .replace(',', '.')
      const faturaTexto = String(formData.get(`f_${alunoId}_${ano}_${mes}`) ?? '').trim()

      if (valorTexto === '') {
        await supabase
          .from('mensalidades')
          .delete()
          .eq('aluno_id', alunoId)
          .eq('professor_id', professorId)
          .eq('ano', ano)
          .eq('mes', mes)
        continue
      }

      const valor = Number(valorTexto)
      if (Number.isNaN(valor) || valor < 0) continue

      paraGuardar.push({
        aluno_id: alunoId,
        professor_id: professorId,
        ano,
        mes,
        valor,
        numero_fatura: faturaTexto || null,
        pago: true,
        pago_em: new Date().toISOString(),
        marcado_por: user.id,
      })
    }
  }

  if (paraGuardar.length > 0) {
    await supabase
      .from('mensalidades')
      .upsert(paraGuardar, { onConflict: 'aluno_id,professor_id,ano,mes' })
  }

  revalidatePath(`/admin/pagamentos/historico/${professorId}`)
  revalidatePath('/admin/pagamentos/confirmar')
}
