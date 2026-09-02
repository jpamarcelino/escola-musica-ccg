import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Bell,
  ChevronRight,
  GraduationCap,
  Inbox,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from 'lucide-react'
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
    { count: avisosPorLer },
  ] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', user.id).single(),
    supabase.from('perfis_escola').select('tipo'),
    supabase.from('matriculas').select('aluno_id, estado'),
    supabase
      .from('recomendacoes')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'registada'),
    supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('lida', false),
  ])

  const nomeCompleto = (nomeData?.nome ?? '').trim()
  const primeiroNome = nomeCompleto.split(/\s+/)[0] || 'bem-vindo'
  const inicial = (nomeCompleto[0] ?? 'S').toUpperCase()
  // "Alunos" é quem tem matrícula confirmada — quem anda cá e paga.
  //
  // Contava-se a tabela `alunos` inteira, que é outra coisa: um perfil de
  // aluno cria-se numa conta antes de haver pedido nenhum, fica lá depois
  // de a matrícula ser cancelada, e conta na mesma quem só chegou a pedir
  // uma aula. O número aparece ao lado de "Professores" e "Aulas
  // confirmadas", e a secretaria lia-o como dimensão real da escola.
  //
  // Por aluno e não por matrícula: quem anda em duas disciplinas é uma
  // pessoa, e são duas aulas — o cartão do lado é que conta as aulas.
  const alunos = new Set(
    (matriculasData ?? []).filter((m) => m.estado === 'confirmado').map((m) => m.aluno_id)
  ).size
  const professores = (perfisData ?? []).filter((p) => p.tipo === 'professor').length
  const totalConfirmadas = (matriculasData ?? []).filter((m) => m.estado === 'confirmado').length
  const totalPendentes = (matriculasData ?? []).filter((m) => m.estado === 'a_escolher').length

  const dataDeHoje = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'long' })
    .format(new Date())
    .replace('.', '')

  return (
    <main id="conteudo-principal" className="pinterest-home pinterest-admin">
      <div className="pinterest-home-folha">
        <header className="pinterest-home-cabecalho">
          <div>
            <h1>
              {saudacaoDoDia()}, {primeiroNome}.
            </h1>
            <p>Secretaria · {dataDeHoje}</p>
          </div>
          <span className="pinterest-home-avatar" aria-hidden="true">
            {inicial}
          </span>
        </header>

        {/* O destaque é o mesmo cartão da próxima aula do professor: o fade
            azul reservado ao que exige acção agora. Aqui é o pedido de aula
            à espera de professor e horário — a única coisa nesta página em
            que alguém está do outro lado à espera. */}
        <Link
          href="/admin/alunos"
          className={`pinterest-aula pinterest-admin-destaque${
            totalPendentes === 0 ? ' pinterest-aula-vazia' : ''
          }`}
        >
          <span className="pinterest-aula-icone">
            <Inbox size={22} aria-hidden="true" />
          </span>
          {totalPendentes > 0 && <span className="pinterest-aula-data">Prioridade</span>}
          <strong>
            {totalPendentes === 0
              ? 'Sem pedidos por confirmar'
              : `${totalPendentes} ${
                  totalPendentes === 1 ? 'pedido de aula' : 'pedidos de aula'
                } por confirmar`}
          </strong>
          <span className="pinterest-aula-aluno">
            {totalPendentes > 0
              ? 'Aguardam atribuição de professor e horário.'
              : 'Consultar alunos'}
          </span>
          <ChevronRight className="pinterest-aula-seta" size={20} aria-hidden="true" />
        </Link>

        <section className="pinterest-home-seccao" aria-labelledby="titulo-numeros">
          <div className="pinterest-home-seccao-topo">
            <h2 id="titulo-numeros">Escola em números</h2>
          </div>
          <dl className="pinterest-admin-numeros">
            <div>
              <dt>Alunos</dt>
              <dd>{alunos}</dd>
            </div>
            <div>
              <dt>Professores</dt>
              <dd>{professores}</dd>
            </div>
            <div>
              <dt>Aulas confirmadas</dt>
              <dd>{totalConfirmadas}</dd>
            </div>
          </dl>
        </section>

        <section className="pinterest-home-seccao" aria-labelledby="titulo-operacoes">
          <div className="pinterest-home-seccao-topo">
            <h2 id="titulo-operacoes">Operações</h2>
          </div>
          <nav className="pinterest-admin-operacoes" aria-label="Operações da secretaria">
            <Link href="/admin/pagamentos">
              <span>
                <WalletCards size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>Mensalidades</strong>
                <small>Confirmação e histórico financeiro</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/admin/recomendacoes">
              <span>
                <Sparkles size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>Programa de Recomendação</strong>
                <small>
                  {(recomendacoesPorValidar ?? 0) > 0
                    ? `${recomendacoesPorValidar} por validar`
                    : 'Sem validações pendentes'}
                </small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/admin/alunos">
              <span>
                <UsersRound size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>Alunos</strong>
                <small>Inscrições, contactos e disciplinas</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/admin/professores">
              <span>
                <GraduationCap size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>Professores</strong>
                <small>Contas, horários e alunos</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/admin/mensagens">
              <span>
                <MessageSquare size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>Mensagens</strong>
                <small>Escrever a alunos e professores</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            {/* A secretaria passou a receber avisos (migração 0029: um
                cancelamento de matrícula tem de chegar a quem trata das
                mensalidades). A barra de baixo já tem os cinco destinos
                que cabem, por isso a porta é aqui. */}
            <Link href="/admin/avisos">
              <span>
                <Bell size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>Avisos</strong>
                <small>
                  {(avisosPorLer ?? 0) > 0 ? `${avisosPorLer} por ler` : 'Sem avisos novos'}
                </small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            {perfilAtual.super_admin && (
              <Link href="/admin/administradores">
                <span>
                  <ShieldCheck size={20} aria-hidden="true" />
                </span>
                <span>
                  <strong>Administradores</strong>
                  <small>Acessos e permissões</small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            )}
          </nav>
        </section>
      </div>
    </main>
  )
}
