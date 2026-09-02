import { notFound, redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { AvisoDetalhe } from '@/components/aviso-detalhe'
import { accaoDoAviso } from '@/lib/avisos'

// Um aviso da Conta CCG, aberto.
//
// A consulta filtra pelo user_id além do id. A RLS já o fazia — isto é a
// segunda fechadura, e é a que faz a diferença entre "não é teu" e um
// erro de servidor: sem linha, é 404.
export default async function AvisoPage({
  params,
}: {
  params: Promise<{ avisoId: string }>
}) {
  const { avisoId } = await params
  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
  }

  const id = Number(avisoId)
  if (!Number.isInteger(id)) {
    notFound()
  }

  const { data: aviso } = await supabase
    .from('notificacoes')
    .select('id, tipo, titulo, mensagem, lida, criado_em, aluno_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!aviso) {
    notFound()
  }

  const [{ data: tipo }, { data: aluno }] = await Promise.all([
    supabase.from('tipos_aviso').select('titulo, destino').eq('tipo', aviso.tipo).maybeSingle(),
    aviso.aluno_id
      ? supabase.from('alunos').select('nome').eq('id', aviso.aluno_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <AvisoDetalhe
      id={aviso.id}
      // O nome do aluno, quando o aviso é sobre alguém: numa família com
      // dois filhos, saber de quem se fala importa mais do que a
      // categoria. Senão fica a palavra neutra — pôr aqui o nome do tipo
      // era escrevê-lo duas vezes, porque é ele que serve de título.
      sobretitulo={aluno?.nome ?? 'Aviso'}
      // O título da linha, quando alguém o escreveu à mão (é a
      // assinatura); senão o do tipo. Uma página precisa de um título.
      titulo={aviso.titulo ?? tipo?.titulo ?? 'Aviso'}
      mensagem={aviso.mensagem}
      criadoEm={aviso.criado_em}
      lida={aviso.lida}
      accao={accaoDoAviso(tipo?.destino)}
      voltarPara="/dashboard/avisos"
      variante="pinterest"
    />
  )
}
