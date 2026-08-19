import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/empty-state'
import { BotaoSecundario } from '@/components/botao-secundario'
import type { RecomendacaoEstado } from '@ccg/types'

type RecomendacaoLinha = {
  id: number
  recomendador_nome: string
  novo_aluno_nome: string
  professor_nome: string
  modalidade: string | null
  estado: RecomendacaoEstado
  criado_em: string
}

const ESTADO_LABEL: Record<string, string> = {
  registada: 'Por validar',
  validada: 'Validada',
  anulada: 'Anulada',
}

// Reaproveita as cores já usadas nas presenças e nas mensalidades, para
// "validada" ler como verde e "anulada" como vermelho sem inventar
// vocabulário visual novo.
const ESTADO_CLASSE: Record<string, string> = {
  registada: 'estado-falta_aviso',
  validada: 'estado-presente',
  anulada: 'estado-falta_sem_aviso',
}

export default async function RecomendacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams

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

  const { data: recomendacoesData } = await supabase
    .from('recomendacoes')
    .select('id, recomendador_nome, novo_aluno_nome, professor_nome, modalidade, estado, criado_em')
    .order('criado_em', { ascending: false })
  const recomendacoes = (recomendacoesData ?? []) as RecomendacaoLinha[]

  // As indicações que chegaram pelos pedidos de aula (0026). São
  // afirmações por confirmar, não recomendações — por isso vivem numa
  // secção própria, acima da lista, e não misturadas com as validadas.
  const { data: indicacoesData } = await supabase
    .from('indicacoes_recomendacao')
    .select('id, novo_aluno_nome, recomendador_nome_indicado, modalidade_indicada, criado_em')
    .eq('estado', 'por_confirmar')
    .order('criado_em', { ascending: true })
  const indicacoes = (indicacoesData ?? []) as {
    id: number
    novo_aluno_nome: string
    recomendador_nome_indicado: string
    modalidade_indicada: string | null
    criado_em: string
  }[]

  const { data: beneficiosData } = await supabase.from('beneficios').select('estado')
  const beneficios = beneficiosData ?? []

  const porValidar = recomendacoes.filter((r) => r.estado === 'registada').length
  const validadas = recomendacoes.filter((r) => r.estado === 'validada').length
  const pendentes = beneficios.filter((b) => b.estado === 'pendente').length
  const usados = beneficios.filter((b) => b.estado === 'usado').length

  return (
    <main id="conteudo-principal" className="partitura-pagina recomendacoes-admin-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><Link href="/admin" className="partitura-voltar" aria-label="Voltar à visão geral">←</Link><div><p className="partitura-sobretitulo">Projeto-piloto · 2026/2027</p><h1>Recomendações</h1><p>Acompanhar validações e benefícios atribuídos.</p></div></header>

        {erro && <p className="admin-alerta" role="alert">{decodeURIComponent(erro)}</p>}

        <section className="recomendacoes-balanco" aria-label="Balanço do programa">
          <div className="recomendacoes-prioridade"><span>{porValidar}</span><p>Por validar</p></div>
          <dl><div><dt>Validadas</dt><dd>{validadas}</dd></div><div><dt>Meses por usar</dt><dd>{pendentes}</dd></div><div><dt>Meses já dados</dt><dd>{usados}</dd></div></dl>
        </section>

        <nav className="recomendacoes-acoes" aria-label="Ações do programa"><Link href="/admin/recomendacoes/nova">Registar recomendação <i aria-hidden="true">＋</i></Link><Link href="/admin/recomendacoes/estudo">Dados para o estudo <i aria-hidden="true">→</i></Link></nav>

        {indicacoes.length > 0 && (
          <section className="indicacoes-seccao" aria-labelledby="indicacoes-titulo">
            <header>
              <p className="partitura-indice">00</p>
              <h2 id="indicacoes-titulo">
                {indicacoes.length === 1
                  ? 'Uma indicação por confirmar'
                  : `${indicacoes.length} indicações por confirmar`}
              </h2>
              <p>
                Escritas por quem pediu a aula. O nome é como a pessoa o escreveu —
                confirma de quem se trata antes de registar a recomendação.
              </p>
            </header>
            <ul className="indicacoes-lista">
              {indicacoes.map((i) => (
                <li key={i.id}>
                  <Link href={`/admin/recomendacoes/nova?indicacao=${i.id}`}>
                    <div>
                      <p>
                        <strong>{i.recomendador_nome_indicado}</strong> recomendou{' '}
                        {i.novo_aluno_nome}
                      </p>
                      <small>
                        {i.modalidade_indicada
                          ? `Terá aulas de ${i.modalidade_indicada} · `
                          : ''}
                        {new Intl.DateTimeFormat('pt-PT', {
                          day: '2-digit',
                          month: 'short',
                        }).format(new Date(i.criado_em))}
                      </small>
                    </div>
                    <i aria-hidden="true">→</i>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="recomendacoes-registos">
          <header><p className="partitura-indice">01</p><h2>Todas as recomendações</h2></header>
          {recomendacoes.length === 0 ? (
            /* EmptyState em vez de texto solto: era das poucas listas da
               app que ainda anunciava o vazio sem dizer o que fazer a
               seguir, e aqui a próxima ação é evidente. */
            <EmptyState
              titulo="Ainda não há recomendações registadas"
              descricao="Quando um encarregado trouxer outra família, regista aqui a recomendação para o benefício ser atribuído."
              acao={<BotaoSecundario href="/admin/recomendacoes/nova">Registar recomendação</BotaoSecundario>}
            />
          ) : (
            <div className="recomendacoes-lista">
              {recomendacoes.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/recomendacoes/${r.id}`}
                  className="recomendacao-linha"
                >
                  <div className="recomendacao-nomes">
                    <p>
                      {r.recomendador_nome} → {r.novo_aluno_nome}
                    </p>
                    <small>
                      {r.professor_nome}
                      {r.modalidade && ` — ${r.modalidade}`}
                    </small>
                  </div>
                  <span className={`estado-pill ${ESTADO_CLASSE[r.estado] ?? ''}`}>
                    {ESTADO_LABEL[r.estado] ?? r.estado}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
