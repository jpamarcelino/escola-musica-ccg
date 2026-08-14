import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { CartaoLink } from '@/components/cartao-link'
import { FundoPapel } from '@/components/fundo-papel'

export default async function AlunoHubPage({
  params,
}: {
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: aluno } = await supabase
    .from('alunos')
    .select('nome')
    .eq('id', alunoId)
    .eq('encarregado_id', user.id)
    .maybeSingle()

  if (!aluno) {
    notFound()
  }

  const { count: notificacoesPorLer } = await supabase
    .from('notificacoes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('lida', false)

  return (
    <FundoPapel largura="larga">
      <div className="space-y-[26px]">
        <PageHeader voltar="/dashboard" titulo={aluno.nome} />

        <div className="flex flex-col gap-[11px] md:grid md:grid-cols-2 md:items-start">
          <CartaoLink href={`/aluno/${alunoId}/pedido`} nome="Pedir Aula" />
          <CartaoLink href={`/aluno/${alunoId}/horario`} nome="Horário e Aulas" />
          <CartaoLink href={`/aluno/${alunoId}/materiais`} nome="Materiais das Aulas" />
          <CartaoLink
            href="/aluno/notificacoes"
            nome="Notificações"
            contagem={notificacoesPorLer ?? 0}
          />
        </div>
      </div>
    </FundoPapel>
  )
}
