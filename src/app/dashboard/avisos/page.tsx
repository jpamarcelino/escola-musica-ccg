import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { marcarNotificacaoLida, marcarTodasNotificacoesLidas } from '@/lib/actions/notificacoes'
import { EmptyState } from '@/components/empty-state'
import { ehContaCCG } from '@/lib/navegacao'

type Notificacao = {
  id: number
  mensagem: string
  lida: boolean
  criado_em: string
  aluno_id: string | null
}

// Avisos da Conta CCG. Estava em /aluno/notificacoes, o que dava a
// entender que pertenciam a um aluno — não pertencem: a caixa é da conta,
// e um dependente não tem caixa própria. O que mudou foi passarem a poder
// dizer a QUE aluno se referem (notificacoes.aluno_id, migração 0025),
// para uma família com dois filhos perceber de quem fala cada aviso.
//
// O nome do aluno vem da tabela, por join — não de procurar o nome dentro
// do texto da mensagem. Além de frágil, isso deixou de ser possível: a
// migração 0024 tirou o nome do aluno das mensagens de mensalidade.
export default async function AvisosPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>
}) {
  const { aluno: alunoFiltro } = await searchParams
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }

  if (!ehContaCCG(profile?.tipo)) {
    redirect('/dashboard')
  }

  const [avisosResposta, { data: alunosData }] = await Promise.all([
    supabase
      .from('notificacoes')
      .select('id, mensagem, lida, criado_em, aluno_id')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('alunos')
      .select('id, nome')
      .eq('encarregado_id', user.id)
      .order('criado_em'),
  ])

  // Enquanto a migração 0025 não correr, a coluna aluno_id ainda não
  // existe e o pedido acima falha inteiro (a base devolve 42703, não uma
  // lista sem a coluna). Sem esta segunda tentativa, publicar o código
  // antes da migração deixava a página de avisos em branco.
  //
  // Assim que a migração estiver aplicada e confirmada, este bloco pode
  // desaparecer — é a única coisa que ainda contempla a base antiga.
  let avisosData = avisosResposta.data
  const temColunaAluno = !avisosResposta.error
  if (avisosResposta.error) {
    const semColuna = await supabase
      .from('notificacoes')
      .select('id, mensagem, lida, criado_em')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false })
    avisosData = (semColuna.data ?? []).map((n) => ({ ...n, aluno_id: null }))
  }

  const todos = (avisosData ?? []) as Notificacao[]
  const alunos = alunosData ?? []
  const nomePorAluno = new Map(alunos.map((a) => [a.id, a.nome]))

  // O filtro é só apresentação: a lista já vem limitada ao user_id pela
  // consulta e pela policy de RLS. Filtrar por um id de outra família não
  // revela nada — simplesmente não há avisos que correspondam.
  const filtroValido = alunoFiltro && nomePorAluno.has(alunoFiltro) ? alunoFiltro : null
  const avisos = filtroValido ? todos.filter((n) => n.aluno_id === filtroValido) : todos

  const porLer = avisos.filter((n) => !n.lida).length

  return (
    <main id="conteudo-principal" className="partitura-pagina avisos-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Arquivo familiar</p>
            <h1>Avisos</h1>
            <p>
              {porLer > 0
                ? `${porLer} ${porLer === 1 ? 'aviso novo' : 'avisos novos'}`
                : 'Estás em dia.'}
            </p>
          </div>
        </header>

        {/* Só vale a pena filtrar quando há mais do que um aluno — com um
            só, os dois separadores mostrariam a mesma lista. E não vale
            de todo antes da migração: sem a coluna aluno_id, filtrar por
            aluno devolveria sempre uma lista vazia. */}
        {temColunaAluno && alunos.length > 1 && (
          <nav className="filtro-alunos" aria-label="Filtrar avisos por aluno">
            <Link href="/dashboard/avisos" aria-current={!filtroValido ? 'page' : undefined}>
              Todos
            </Link>
            {alunos.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/avisos?aluno=${a.id}`}
                aria-current={filtroValido === a.id ? 'page' : undefined}
              >
                {a.nome.split(' ')[0]}
              </Link>
            ))}
          </nav>
        )}

        {porLer > 0 && (
          <form action={marcarTodasNotificacoesLidas}>
            <button type="submit" className="avisos-marcar-todos">
              Marcar todas como lidas
            </button>
          </form>
        )}

        {avisos.length === 0 ? (
          <EmptyState
            titulo={
              filtroValido
                ? `Sem avisos sobre ${nomePorAluno.get(filtroValido)}`
                : 'Ainda não tens avisos'
            }
            descricao={
              filtroValido ? 'Os avisos desta conta podem estar noutro aluno.' : undefined
            }
          />
        ) : (
          <section className="avisos-lista" aria-label="Arquivo de avisos">
            {avisos.map((n) => {
              const nomeAluno = n.aluno_id ? nomePorAluno.get(n.aluno_id) : null
              return (
                <article key={n.id} data-lida={n.lida}>
                  <time>{new Date(n.criado_em).toLocaleDateString('pt-PT')}</time>
                  {/* A etiqueta e a mensagem vão juntas num só filho: o
                      article é uma grelha de três colunas com posições
                      fixas (ver globals.css), e um quarto filho solto
                      desalinhava a linha toda no telemóvel. */}
                  <div className="avisos-corpo">
                    {/* Avisos antigos (e os gerais da conta) não têm aluno
                        associado e continuam a aparecer, sem etiqueta. */}
                    {nomeAluno && <span className="avisos-aluno">{nomeAluno}</span>}
                    <p>{n.mensagem}</p>
                  </div>
                  {!n.lida && (
                    <form action={marcarNotificacaoLida}>
                      <input type="hidden" name="notificacaoId" value={n.id} />
                      <button type="submit" className="avisos-marcar-um">
                        Marcar como lida
                      </button>
                    </form>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
