import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
    <main id="conteudo-principal" className="partitura-pagina aluno-hub-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">←</Link>
          <div><p className="partitura-sobretitulo">Caderno do aluno</p><h1>{aluno.nome}</h1><p>Aulas, pedidos e materiais num só lugar.</p></div>
        </header>

        <nav className="aluno-hub-links" aria-label={`Área de ${aluno.nome}`}>
          <Link href={`/aluno/${alunoId}/horario`}><span><b>01</b><strong>Agenda</strong></span><small>Próximas aulas e pedidos em curso</small><i aria-hidden="true">→</i></Link>
          <Link href={`/aluno/${alunoId}/materiais`}><span><b>02</b><strong>Materiais</strong></span><small>Ferramentas para acompanhar as aulas</small><i aria-hidden="true">→</i></Link>
          <Link href={`/aluno/${alunoId}/pedido`}><span><b>03</b><strong>Pedir aula</strong></span><small>Escolher escola, disciplina e professor</small><i aria-hidden="true">→</i></Link>
          <Link href="/aluno/notificacoes"><span><b>04</b><strong>Avisos</strong></span><small>{(notificacoesPorLer ?? 0) > 0 ? `${notificacoesPorLer} por ler` : 'Tudo lido'}</small><i aria-hidden="true">→</i></Link>
        </nav>
      </div>
    </main>
  )
}
