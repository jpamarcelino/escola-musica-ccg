import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { carregarAlunosAlvo, carregarProfessoresAlvo } from '@/lib/alvos-mensagem'
import { MensagemEscolaForm } from '@/components/mensagem-escola-form'
import { EmptyState } from '@/components/empty-state'
import { descreverAlvo, type MensagemEnviada } from '@/lib/mensagens-historico'

// A secretaria escreve para a escola.
//
// É o contrário de tudo o resto em `notificacoes`: até aqui, um aviso
// nascia sempre de um facto registado na app. Aqui nasce de alguém ter
// alguma coisa para dizer — e por isso o formulário tem de responder a
// duas perguntas antes do texto: a quem, e em nome de quem.
export default async function AdminMensagensPage() {
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

  const [{ data: eu }, alunos, professores, { data: historicoData }] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', user.id).single(),
    carregarAlunosAlvo(supabase),
    carregarProfessoresAlvo(supabase),
    supabase
      .from('mensagens_escola')
      .select(
        'id, assinatura, corpo, publico, filtro, programa, destinatarios, criado_em, autor:profiles!mensagens_escola_autor_id_fkey(nome)'
      )
      .order('criado_em', { ascending: false })
      .limit(20),
  ])

  const historico = (historicoData ?? []) as unknown as MensagemEnviada[]

  return (
    <main id="conteudo-principal" className="partitura-pagina mensagens-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/admin" className="partitura-voltar" aria-label="Voltar à visão geral">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Secretaria</p>
            <h1>Mensagens</h1>
            <p>Chega à app e ao telemóvel de quem tiver notificações ligadas.</p>
          </div>
        </header>

        <section className="mensagens-nova" aria-label="Escrever uma mensagem">
          <MensagemEscolaForm
            admin
            nomeAutor={eu?.nome ?? ''}
            professores={professores}
            alunos={alunos}
          />
        </section>

        <section className="mensagens-historico" aria-labelledby="historico-titulo">
          <header>
            <p className="partitura-indice">02</p>
            <h2 id="historico-titulo">Enviadas</h2>
          </header>

          {historico.length === 0 ? (
            <EmptyState
              titulo="Ainda não saiu nenhuma"
              descricao="As mensagens enviadas ficam aqui, com o número de pessoas que as recebeu."
            />
          ) : (
            <div className="space-y-2">
              {historico.map((m) => (
                <article key={m.id} className="lista-item">
                  <span className="lista-item-titulo block">
                    {m.assinatura ?? 'Sem nome'}
                  </span>
                  <span className="lista-item-sub">
                    {new Date(m.criado_em).toLocaleDateString('pt-PT')} · {descreverAlvo(m)} ·{' '}
                    {m.destinatarios} {m.destinatarios === 1 ? 'pessoa' : 'pessoas'}
                    {/* Quem escreveu, sempre. Uma mensagem sem nome é
                        anónima para quem a recebe, não para a casa. */}
                    {m.autor?.nome ? ` · por ${m.autor.nome}` : ''}
                  </span>
                  <p className="mensagens-historico-corpo">{m.corpo}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
