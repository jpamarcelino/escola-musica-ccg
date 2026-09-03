import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { carregarAlunosAlvo, carregarProfessoresAlvo } from '@/lib/alvos-mensagem'
import { MensagemEscolaForm } from '@/components/mensagem-escola-form'
import { EmptyState } from '@/components/empty-state'
import { descreverAlvo, type MensagemEnviada } from '@/lib/mensagens-historico'
import { VoltarAtras } from '@/components/voltar-atras'
import { History, Send } from 'lucide-react'

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
    <main id="conteudo-principal" className="pinterest-admin-mensagens">
      <div className="pinterest-admin-mensagens-folha">
        <header className="pinterest-admin-mensagens-cabecalho">
          <VoltarAtras destino="/admin" className="pinterest-admin-mensagens-voltar" rotulo="Voltar à visão geral" tamanho={23} />
          <div>
            <p className="pinterest-admin-mensagens-sobretitulo">Comunicação escolar</p>
            <h1>Mensagens</h1>
            <p>Envia avisos para alunos, famílias e professores.</p>
          </div>
        </header>

        <div className="pinterest-admin-mensagens-grelha">
          <section className="mensagens-nova" aria-labelledby="nova-mensagem-titulo">
            <header className="pinterest-admin-mensagens-seccao-titulo">
              <span><Send size={19} aria-hidden="true" /></span>
              <div>
                <h2 id="nova-mensagem-titulo">Nova mensagem</h2>
                <p>Escolhe quem recebe e revê antes de enviar.</p>
              </div>
            </header>
            <MensagemEscolaForm
              admin
              nomeAutor={eu?.nome ?? ''}
              professores={professores}
              alunos={alunos}
            />
          </section>

          <section className="mensagens-historico" aria-labelledby="historico-titulo">
            <header className="pinterest-admin-mensagens-seccao-titulo">
              <span><History size={19} aria-hidden="true" /></span>
              <div>
                <h2 id="historico-titulo">Enviadas</h2>
                <p>As últimas 20 mensagens.</p>
              </div>
            </header>

            {historico.length === 0 ? (
              <EmptyState
                titulo="Ainda não saiu nenhuma"
                descricao="As mensagens enviadas ficam aqui, com o número de pessoas que as recebeu."
              />
            ) : (
              <div className="pinterest-admin-mensagens-historico-lista">
                {historico.map((m) => (
                  <article key={m.id}>
                    <strong>{m.assinatura ?? 'Mensagem da escola'}</strong>
                    <span>
                      {new Date(m.criado_em).toLocaleDateString('pt-PT')} · {descreverAlvo(m)} ·{' '}
                      {m.destinatarios} {m.destinatarios === 1 ? 'pessoa' : 'pessoas'}
                      {m.autor?.nome ? ` · por ${m.autor.nome}` : ''}
                    </span>
                    <p className="mensagens-historico-corpo">{m.corpo}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
