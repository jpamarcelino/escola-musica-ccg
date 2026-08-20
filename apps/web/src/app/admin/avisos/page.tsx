import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { marcarNotificacaoLida, marcarTodasNotificacoesLidas } from '@/lib/actions/notificacoes'
import { EmptyState } from '@/components/empty-state'

type Notificacao = {
  id: number
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
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: avisosData } = await supabase
    .from('notificacoes')
    .select('id, titulo, mensagem, lida, criado_em')
    .eq('user_id', user.id)
    .order('criado_em', { ascending: false })

  const avisos = (avisosData ?? []) as Notificacao[]
  const porLer = avisos.filter((n) => !n.lida).length

  return (
    <main id="conteudo-principal" className="partitura-pagina avisos-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/admin" className="partitura-voltar" aria-label="Voltar à visão geral">
            ←
          </Link>
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

        {porLer > 0 && (
          <form action={marcarTodasNotificacoesLidas}>
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
                <div className="avisos-corpo">
                  {n.titulo && <strong className="avisos-titulo">{n.titulo}</strong>}
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
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
