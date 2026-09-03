import { notFound, redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { AvisoDetalhe } from '@/components/aviso-detalhe'
import { accaoDoAviso } from '@/lib/avisos'

// O mesmo, do lado da secretaria. Sem etiqueta de aluno: um
// administrador não gere alunos seus.
export default async function AdminAvisoPage({
  params,
}: {
  params: Promise<{ avisoId: string }>
}) {
  const { avisoId } = await params
  const { supabase, user } = await getAuthContext()

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

  const id = Number(avisoId)
  if (!Number.isInteger(id)) {
    notFound()
  }

  const { data: aviso } = await supabase
    .from('notificacoes')
    .select('id, tipo, titulo, mensagem, lida, criado_em')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!aviso) {
    notFound()
  }

  const { data: tipo } = await supabase
    .from('tipos_aviso')
    .select('titulo, destino')
    .eq('tipo', aviso.tipo)
    .maybeSingle()

  return (
    <AvisoDetalhe
      id={aviso.id}
      sobretitulo="Secretaria"
      titulo={aviso.titulo ?? tipo?.titulo ?? 'Aviso'}
      mensagem={aviso.mensagem}
      criadoEm={aviso.criado_em}
      lida={aviso.lida}
      accao={accaoDoAviso(tipo?.destino)}
      voltarPara="/admin/avisos"
      variante="pinterest"
      classePagina="pinterest-admin-aviso"
    />
  )
}
