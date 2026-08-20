'use server'

import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ConviteState = { error?: string; link?: string; info?: string } | undefined

function gerarCodigo() {
  return randomBytes(6).toString('hex')
}

async function origem() {
  const { headers } = await import('next/headers')
  const headersList = await headers()
  const host = headersList.get('host')
  const protocolo = host?.startsWith('localhost') ? 'http' : 'https'
  return `${protocolo}://${host}`
}

export async function criarConviteProfessor(
  _prevState: ConviteState,
  formData: FormData
): Promise<ConviteState> {
  const programa = String(formData.get('programa') ?? '')
  if (programa !== 'musica' && programa !== 'danca') {
    return { error: 'Escolhe a escola (Música ou Dança).' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const codigo = gerarCodigo()
  const { error } = await supabase.from('convites').insert({
    codigo,
    tipo: 'professor',
    programa,
    criado_por: user.id,
  })

  if (error) {
    return { error: 'Não foi possível criar o convite. Tenta novamente.' }
  }

  revalidatePath('/admin/professores')
  return { link: `${await origem()}/registo?convite=${codigo}` }
}

// O convite de administrador deixou de existir. Dar acesso à
// administração passou a ser um ato sobre uma pessoa que já tem conta,
// feito em /admin/administradores — e não um link que anda a circular e
// que dá poderes totais a quem o abrir primeiro.

export async function criarConviteMigracaoAluno(
  _prevState: ConviteState,
  formData: FormData
): Promise<ConviteState> {
  const alunoId = String(formData.get('alunoId') ?? '')
  if (!alunoId) {
    return { error: 'Aluno inválido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const codigo = gerarCodigo()
  const { error } = await supabase.from('convites').insert({
    codigo,
    tipo: 'migracao_aluno',
    aluno_id: alunoId,
    criado_por: user.id,
  })

  if (error) {
    return { error: 'Não foi possível criar o link. Tenta novamente.' }
  }

  return { link: `${await origem()}/registo?convite=${codigo}` }
}

export async function resgatarConvite(
  _prevState: ConviteState,
  formData: FormData
): Promise<ConviteState> {
  const codigo = String(formData.get('codigo') ?? '').trim()
  if (!codigo) {
    return { error: 'Introduz o código do convite.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.rpc('resgatar_convite_migracao', { p_codigo: codigo })

  if (error) {
    return { error: 'Código inválido ou já utilizado.' }
  }

  revalidatePath('/dashboard')
  return { info: 'Perfil de aluno associado à tua conta.' }
}
