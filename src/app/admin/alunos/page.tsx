import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { ListaComPesquisa } from '@/components/lista-com-pesquisa'

type Aluno = {
  id: string
  nome: string
}

export default async function AdminAlunosPage() {
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

  const { data: alunosData } = await supabase
    .from('alunos')
    .select('id, nome')
    .order('nome')
  const alunos = (alunosData ?? []) as Aluno[]

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/admin" titulo="Alunos" />

        {alunos.length === 0 ? (
          <EmptyState
            titulo="Ainda não há alunos registados"
            descricao="Os alunos aparecem aqui assim que alguém pede uma aula ou cria conta em pedir-aula."
          />
        ) : (
          <ListaComPesquisa
            itens={alunos}
            hrefPrefix="/admin/alunos/"
            placeholder="Pesquisar aluno por nome…"
          />
        )}
      </div>
    </main>
  )
}
