import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext, getAvisosPorLer } from '@/lib/auth-context'
import { marcarTodasNotificacoesLidas } from '@/lib/actions/notificacoes'
import { EmptyState } from '@/components/empty-state'
import { ehContaCCG } from '@/lib/navegacao'
import { accaoDoAviso, avisoDoPapel, type PapelAviso, type TipoAviso } from '@/lib/avisos'

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
      .order('criado_em', { ascending: false })
      // Desempate pelo id: dois avisos criados na mesma
      // transação têm o mesmo instante ao microssegundo, e sem
      // isto trocavam de lugar entre visitas.
      .order('id', { ascending: false }),
    // Os separadores por aluno só fazem sentido a quem tem alunos. Para
    // um professor, a consulta devolve vazio e a barra não aparece.
    familia
      ? supabase
          .from('alunos')
          .select('id, nome')
          .eq('encarregado_id', user.id)
          .order('criado_em')
      : Promise.resolve({ data: [] }),
    supabase.from('tipos_aviso').select('tipo, titulo, destino, papeis'),
  ])

  // Título e destino de cada tipo, para o aviso dentro da app dizer o
  // mesmo que a push e levar ao mesmo sítio.
  const tipos = new Map(((tiposData ?? []) as TipoAviso[]).map((t) => [t.tipo, t]))

  // Esta caixa é a do papel de quem entrou — família ou professor. Os
  // avisos que só dizem respeito à secretaria ficam em /admin/avisos,
  // mesmo quando é a mesma conta a receber os dois.
  const papel: PapelAviso = familia ? 'familia' : 'professor'

  const todos = ((avisosData ?? []) as Notificacao[]).filter((n) =>
    avisoDoPapel(tipos.get(n.tipo), papel)
  )
  const alunos = alunosData ?? []
  const nomePorAluno = new Map(alunos.map((a) => [a.id, a.nome]))

  // O filtro é só apresentação: a lista já vem limitada ao user_id pela
  // consulta e pela policy de RLS. Filtrar por um id de outra família não
  // revela nada — simplesmente não há avisos que correspondam.
  const filtroValido = alunoFiltro && nomePorAluno.has(alunoFiltro) ? alunoFiltro : null
  const avisos = filtroValido ? todos.filter((n) => n.aluno_id === filtroValido) : todos

  const porLer = avisos.filter((n) => !n.lida).length

  // Quem é professor E está na direção tem duas caixas. Separá-las sem
  // dizer onde está a outra seria trocar avisos misturados por avisos
  // perdidos — daí esta ponte, que só aparece a quem tem os dois papéis.
  const naSecretaria = profile?.admin ? await getAvisosPorLer('secretaria') : 0

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

        {profile?.admin && (
          <Link href="/admin/avisos" className="avisos-outra-caixa">
            <span>Avisos da secretaria</span>
            <small>
              {naSecretaria > 0
                ? `${naSecretaria} por ler`
                : 'Em dia'}
            </small>
            <b aria-hidden="true">→</b>
          </Link>
        )}

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
            <input type="hidden" name="papel" value={papel} />
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
                  {/* A linha inteira abre o aviso. A lista serve para
                      varrer — a mensagem vem cortada a três linhas, e
                      quem quiser ler o resto entra. Antes, uma mensagem
                      comprida desfazia a lista toda.

                      A etiqueta e a mensagem vão juntas num só filho: o
                      article é uma grelha de três colunas com posições
                      fixas (ver globals.css), e um quarto filho solto
                      desalinhava a linha toda no telemóvel. */}
                  <Link href={`/dashboard/avisos/${n.id}`} className="avisos-corpo">
                    {/* Avisos antigos (e os gerais da conta) não têm aluno
                        associado e continuam a aparecer, sem etiqueta. */}
                    {nomeAluno && <span className="avisos-aluno">{nomeAluno}</span>}
                    {/* Só as mensagens escritas à mão têm título: é a
                        assinatura de quem as escreveu (migração 0042).
                        Nos avisos automáticos, o título é sempre igual ao
                        do tipo e repeti-lo por cima do texto não
                        acrescentava nada. */}
                    {n.titulo && <strong className="avisos-titulo">{n.titulo}</strong>}
                    <p className="avisos-resumo">{n.mensagem}</p>
                  </Link>
                  {/* O mesmo destino que a push usa, à parte da ligação
                      que abre o aviso — não pode ir lá dentro, um link
                      dentro de outro link não é marcação válida. Fica
                      quem quer ler de quem quer responder já. */}
                  {/* Nada de "Ver" quando o destino é este mesmo arquivo:
                      era uma ligação para a página onde a pessoa já está. */}
                  {accaoDoAviso(tipos.get(n.tipo)?.destino) && (
                    <Link
                      href={accaoDoAviso(tipos.get(n.tipo)?.destino)!.href}
                      className="avisos-destino"
                    >
                      Ver
                    </Link>
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
