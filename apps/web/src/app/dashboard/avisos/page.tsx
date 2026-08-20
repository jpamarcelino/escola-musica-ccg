import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { marcarNotificacaoLida, marcarTodasNotificacoesLidas } from '@/lib/actions/notificacoes'
import { EmptyState } from '@/components/empty-state'
import { ehContaCCG } from '@/lib/navegacao'

type Notificacao = {
  id: number
  tipo: string
  titulo: string | null
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

  // Esta página mandava embora quem não fosse Conta CCG — e os
  // professores recebem avisos desde sempre (horário aceite, pedido de
  // reposição, disciplina respondida). Tinham as linhas na base de dados
  // e nenhum sítio onde as ler. Agora serve qualquer papel: a tabela
  // `notificacoes` sempre foi de contas, não de papéis.
  const familia = ehContaCCG(profile?.tipo)

  const [{ data: avisosData }, { data: alunosData }, { data: tiposData }] = await Promise.all([
    supabase
      .from('notificacoes')
      .select('id, tipo, titulo, mensagem, lida, criado_em, aluno_id')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false }),
    // Os separadores por aluno só fazem sentido a quem tem alunos. Para
    // um professor, a consulta devolve vazio e a barra não aparece.
    familia
      ? supabase
          .from('alunos')
          .select('id, nome')
          .eq('encarregado_id', user.id)
          .order('criado_em')
      : Promise.resolve({ data: [] }),
    supabase.from('tipos_aviso').select('tipo, titulo, destino'),
  ])

  // Título e destino de cada tipo, para o aviso dentro da app dizer o
  // mesmo que a push e levar ao mesmo sítio.
  const tipos = new Map(
    ((tiposData ?? []) as { tipo: string; titulo: string; destino: string | null }[]).map((t) => [
      t.tipo,
      t,
    ])
  )

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
            <p className="partitura-sobretitulo">{familia ? 'Arquivo familiar' : 'O que aconteceu'}</p>
            <h1>Avisos</h1>
            <p>
              {porLer > 0
                ? `${porLer} ${porLer === 1 ? 'aviso novo' : 'avisos novos'}`
                : 'Estás em dia.'}
            </p>
          </div>
        </header>

        {/* Só vale a pena filtrar quando há mais do que um aluno — com um
            só, os dois separadores mostrariam a mesma lista. */}
        {alunos.length > 1 && (
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
                    {/* Só as mensagens escritas à mão têm título: é a
                        assinatura de quem as escreveu (migração 0042).
                        Nos avisos automáticos, o título é sempre igual ao
                        do tipo e repeti-lo por cima do texto não
                        acrescentava nada. */}
                    {n.titulo && <strong className="avisos-titulo">{n.titulo}</strong>}
                    <p>{n.mensagem}</p>
                    {/* O mesmo destino que a push usa. Um aviso que diz
                        "precisa da tua resposta" e não leva a lado nenhum
                        obriga a pessoa a adivinhar em que separador é que
                        se responde. */}
                    {tipos.get(n.tipo)?.destino && (
                      <Link href={tipos.get(n.tipo)!.destino!} className="avisos-destino">
                        Ver
                      </Link>
                    )}
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
