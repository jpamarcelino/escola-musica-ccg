import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { criarConviteProfessor } from '@/lib/actions/convites'
import { PageHeader } from '@/components/page-header'
import { ConvidarProfessorForm } from '@/components/convite-forms'
import { EmptyState } from '@/components/empty-state'
import { ListaComPesquisa } from '@/components/lista-com-pesquisa'

type Professor = {
  id: string
  nome: string
}

export default async function AdminProfessoresPage() {
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

  const { data: professoresData } = await supabase
    .from('perfis_escola')
    .select('id, profiles(nome)')
    .eq('tipo', 'professor')
    .order('nome', { referencedTable: 'profiles' })
  const professores = (
    (professoresData ?? []) as unknown as { id: string; profiles: { nome: string } | null }[]
  ).map((p) => ({
    id: p.id,
    nome: p.profiles?.nome ?? '',
  })) as Professor[]

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/admin" titulo="Professores" />

        <ConvidarProfessorForm action={criarConviteProfessor} />

        {professores.length === 0 ? (
          <EmptyState
            titulo="Ainda não há professores registados"
            descricao="Convida um professor no formulário acima — aparece aqui assim que aceitar o convite."
          />
        ) : (
          <ListaComPesquisa
            itens={professores}
            hrefPrefix="/admin/professores/"
            placeholder="Pesquisar professor por nome…"
          />
        )}
      </div>
    </main>
  )
}
