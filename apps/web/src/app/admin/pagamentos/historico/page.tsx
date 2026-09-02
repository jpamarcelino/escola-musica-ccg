import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LinhaLista, GrupoLista } from '@/components/lista'
import { EmptyState } from '@/components/empty-state'
import { VoltarAtras } from '@/components/voltar-atras'

type Professor = {
  id: string
  nome: string
}

export default async function HistoricoPagamentosPage() {
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
    <main id="conteudo-principal" className="partitura-pagina admin-diretorio-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><VoltarAtras destino="/admin/pagamentos" className="partitura-voltar" rotulo="Voltar a mensalidades">←</VoltarAtras><div><p className="partitura-sobretitulo">Arquivo financeiro</p><h1>Histórico</h1><p>Seleciona um professor para consultar o registo mensal.</p></div></header>

        {professores.length === 0 ? (
          <EmptyState titulo="Ainda não há professores registados" />
        ) : (
          <div className="admin-diretorio"><GrupoLista>
            {professores.map((professor) => (
              <LinhaLista
                key={professor.id}
                href={`/admin/pagamentos/historico/${professor.id}`}
                titulo={professor.nome}
              />
            ))}
          </GrupoLista></div>
        )}
      </div>
    </main>
  )
}
