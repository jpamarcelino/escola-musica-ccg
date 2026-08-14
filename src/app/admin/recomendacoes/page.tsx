import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type RecomendacaoLinha = {
  id: number
  recomendador_nome: string
  novo_aluno_nome: string
  professor_nome: string
  modalidade: string | null
  estado: string
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

        <section className="recomendacoes-registos">
          <header><p className="partitura-indice">01</p><h2>Todas as recomendações</h2></header>
          {recomendacoes.length === 0 ? (
            <p className="recomendacoes-vazio">
              Ainda não há recomendações registadas.
            </p>
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
