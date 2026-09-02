import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthContext, getAvisosPorLer } from '@/lib/auth-context'
import { marcarTodasNotificacoesLidas } from '@/lib/actions/notificacoes'
import { EmptyState } from '@/components/empty-state'
import { accaoDoAviso, avisoDoPapel, type TipoAviso } from '@/lib/avisos'
import { VoltarAtras } from '@/components/voltar-atras'

type Notificacao = {
  id: number
  tipo: string
  titulo: string | null
  mensagem: string
  lida: boolean
  criado_em: string
}

// Avisos da secretaria.
//
// Existe porque a partir da migração 0029 a app passou a escrever para
// administradores — até aqui, `notificacoes` só tinha remetente para
// famílias e professores, e um cancelamento de matrícula não chegava a
// ninguém que tratasse das mensalidades.
//
// É mais simples do que a caixa da família: não há filtro por aluno,
// porque um administrador não gere alunos seus — vê a escola inteira, e
// filtrar por nome aqui seria uma lista de trezentos separadores.
export default async function AdminAvisosPage() {
  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin, tipo')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const [{ data: avisosData }, { data: tiposData }] = await Promise.all([
    supabase
      .from('notificacoes')
      .select('id, tipo, titulo, mensagem, lida, criado_em')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false })
      // Desempate pelo id: dois avisos criados na mesma
      // transação têm o mesmo instante ao microssegundo, e sem
      // isto trocavam de lugar entre visitas.
      .order('id', { ascending: false }),
    supabase.from('tipos_aviso').select('tipo, destino, papeis'),
  ])

  // O destino de cada tipo, para a lista poder oferecer o atalho para
  // onde se age sobre o aviso — o mesmo sítio para onde a push leva.
  const tipos = new Map(((tiposData ?? []) as TipoAviso[]).map((t) => [t.tipo, t]))

  // Só o que é da secretaria. Quem é professor e está na direção recebe
  // os dois tipos de aviso na mesma conta — os de professor ficam em
  // /dashboard/avisos, e não misturados com estes.
  const avisos = ((avisosData ?? []) as Notificacao[]).filter((n) =>
    avisoDoPapel(tipos.get(n.tipo), 'secretaria')
  )

  // A outra metade da ponte que existe em /dashboard/avisos: quem também
  // dá aulas tem lá os seus avisos de professor, e daqui não os via.
  const ehProfessor = perfilAtual.tipo === 'professor'
  const naDocencia = ehProfessor ? await getAvisosPorLer('professor') : 0
  const porLer = avisos.filter((n) => !n.lida).length

  return (
    <main id="conteudo-principal" className="partitura-pagina avisos-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <VoltarAtras destino="/admin" className="partitura-voltar" rotulo="Voltar à visão geral">←</VoltarAtras>
          <div>
            <p className="partitura-sobretitulo">Secretaria</p>
            <h1>Avisos</h1>
            <p>
              {porLer > 0
                ? `${porLer} ${porLer === 1 ? 'aviso novo' : 'avisos novos'}`
                : 'Estás em dia.'}
            </p>
          </div>
        </header>

        {ehProfessor && (
          <Link href="/dashboard/avisos" className="avisos-outra-caixa">
            <span>Avisos de professor</span>
            <small>{naDocencia > 0 ? `${naDocencia} por ler` : 'Em dia'}</small>
            <b aria-hidden="true">→</b>
          </Link>
        )}

        {porLer > 0 && (
          <form action={marcarTodasNotificacoesLidas}>
            <input type="hidden" name="papel" value="secretaria" />
            <button type="submit" className="avisos-marcar-todos">
              Marcar todas como lidas
            </button>
          </form>
        )}

        {avisos.length === 0 ? (
          <EmptyState
            titulo="Ainda não há avisos"
            descricao="Aqui aparecem os cancelamentos de matrícula e o resto do que a escola precisa de saber."
          />
        ) : (
          <section className="avisos-lista" aria-label="Arquivo de avisos">
            {avisos.map((n) => (
              <article key={n.id} data-lida={n.lida}>
                <time>{new Date(n.criado_em).toLocaleDateString('pt-PT')}</time>
                {/* Abre o aviso. A mensagem vem cortada a três linhas: a
                    lista é para varrer, a página do aviso é para ler. */}
                <Link href={`/admin/avisos/${n.id}`} className="avisos-corpo">
                  {n.titulo && <strong className="avisos-titulo">{n.titulo}</strong>}
                  <p className="avisos-resumo">{n.mensagem}</p>
                </Link>
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
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
