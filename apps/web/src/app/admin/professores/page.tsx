import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { criarConviteProfessor } from '@/lib/actions/convites'
import { ConvidarProfessorForm } from '@/components/convite-forms'
import { EmptyState } from '@/components/empty-state'
import { ListaComPesquisa } from '@/components/lista-com-pesquisa'
import { VoltarAtras } from '@/components/voltar-atras'

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
  const { count: pedidosPorResponder } = await supabase
    .from('pedidos_instrumento')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'pendente')

  const professores = (
    (professoresData ?? []) as unknown as { id: string; profiles: { nome: string } | null }[]
  ).map((p) => ({
    id: p.id,
    nome: p.profiles?.nome ?? '',
  })) as Professor[]

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-diretorio-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><VoltarAtras destino="/admin" className="partitura-voltar" rotulo="Voltar à visão geral">←</VoltarAtras><div><p className="partitura-sobretitulo">Diretório escolar</p><h1>Professores</h1><p>{professores.length} {professores.length === 1 ? 'registo' : 'registos'}</p></div></header>

        {/* Os pedidos vêm antes do convite: é a única coisa desta
            página que está à espera de alguém. */}
        <nav className="pt-2">
          <Link href="/admin/professores/disciplinas" className="agenda-ligacao-calendario">
            Pedidos de disciplina
            {(pedidosPorResponder ?? 0) > 0 ? ` (${pedidosPorResponder})` : ''}
          </Link>
        </nav>

        <ConvidarProfessorForm action={criarConviteProfessor} />

        {professores.length === 0 ? (
          <EmptyState
            titulo="Ainda não há professores registados"
            descricao="Convida um professor no formulário acima — aparece aqui assim que aceitar o convite."
          />
        ) : (
          <section className="admin-diretorio"><ListaComPesquisa itens={professores} hrefPrefix="/admin/professores/" placeholder="Pesquisar professor por nome…" /></section>
        )}
      </div>
    </main>
  )
}
