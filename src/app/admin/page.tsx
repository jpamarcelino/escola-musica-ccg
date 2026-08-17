import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { saudacaoDoDia } from '@/components/hero-section'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin, super_admin, tipo')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const [
    { data: nomeData },
    { data: perfisData },
    { data: matriculasData },
    { count: recomendacoesPorValidar },
    { count: totalAlunos },
  ] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', user.id).single(),
    supabase.from('perfis_escola').select('tipo'),
    supabase.from('matriculas').select('estado'),
    supabase
      .from('recomendacoes')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'registada'),
    // "Alunos" aqui é dimensão da escola, por isso conta perfis de aluno e
    // não contas de login. Antes contava perfis_escola de tipo 'aluno', o
    // que funcionava só enquanto conta e aluno eram a mesma coisa — agora
    // isso contaria encarregados que nunca vão a uma aula, e deixaria de
    // fora todos os filhos.
    supabase.from('alunos').select('id', { count: 'exact', head: true }),
  ])

  const primeiroNome = (nomeData?.nome ?? '').trim().split(/\s+/)[0] || 'bem-vindo'
  const alunos = totalAlunos ?? 0
  const professores = (perfisData ?? []).filter((p) => p.tipo === 'professor').length
  const totalConfirmadas = (matriculasData ?? []).filter((m) => m.estado === 'confirmado').length
  const totalPendentes = (matriculasData ?? []).filter((m) => m.estado === 'a_escolher').length

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-pagina">
      <div className="partitura-folha">
        <header className="admin-cabecalho">
          <div><p className="partitura-sobretitulo">Secretaria · visão geral</p><h1>{saudacaoDoDia()}, {primeiroNome}.</h1><p>Estado operacional das Escolas Artísticas.</p></div>
          <time>{new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(new Date()).replace('.', '')}</time>
        </header>

        <section className="admin-prioridade" aria-labelledby="prioridade-titulo">
          <span>{totalPendentes}</span>
          <div><p className="partitura-indice">Prioridade</p><h2 id="prioridade-titulo">{totalPendentes === 1 ? 'Pedido de aula por confirmar' : 'Pedidos de aula por confirmar'}</h2><small>{totalPendentes > 0 ? 'Aguardam atribuição de professor e horário.' : 'Não existem pedidos pendentes.'}</small></div>
          <Link href="/admin/alunos">Consultar alunos <i aria-hidden="true">→</i></Link>
        </section>

        <section className="admin-indicadores" aria-label="Dimensão da escola">
          <header><p className="partitura-indice">01</p><h2>Escola em números</h2></header>
          <dl><div><dt>Alunos</dt><dd>{alunos}</dd></div><div><dt>Professores</dt><dd>{professores}</dd></div><div><dt>Aulas confirmadas</dt><dd>{totalConfirmadas}</dd></div></dl>
        </section>

        <section className="admin-operacoes" aria-labelledby="operacoes-titulo">
          <header><p className="partitura-indice">02</p><h2 id="operacoes-titulo">Operações</h2></header>
          <nav>
            <Link href="/admin/pagamentos"><strong>Mensalidades</strong><span>Confirmação e histórico financeiro</span><i aria-hidden="true">→</i></Link>
            <Link href="/admin/recomendacoes"><strong>Programa de Recomendação</strong><span>{(recomendacoesPorValidar ?? 0) > 0 ? `${recomendacoesPorValidar} por validar` : 'Sem validações pendentes'}</span><i aria-hidden="true">→</i></Link>
            <Link href="/admin/alunos"><strong>Alunos</strong><span>Inscrições, contactos e disciplinas</span><i aria-hidden="true">→</i></Link>
            <Link href="/admin/professores"><strong>Professores</strong><span>Contas, horários e alunos</span><i aria-hidden="true">→</i></Link>
            {perfilAtual.super_admin && <Link href="/admin/administradores"><strong>Administradores</strong><span>Acessos e permissões</span><i aria-hidden="true">→</i></Link>}
          </nav>
        </section>
      </div>
    </main>
  )
}
