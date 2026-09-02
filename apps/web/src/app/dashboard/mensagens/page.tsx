import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { carregarAlunosAlvo } from '@/lib/alvos-mensagem'
import { MensagemEscolaForm } from '@/components/mensagem-escola-form'
import { EmptyState } from '@/components/empty-state'
import { descreverAlvo, type MensagemEnviada } from '@/lib/mensagens-historico'
import { History, Send } from 'lucide-react'
import { VoltarAtras } from '@/components/voltar-atras'

// O professor escreve aos seus alunos.
//
// É o mesmo formulário da secretaria com menos portas: só alunos, só os
// dele, e sempre assinado. A diferença que interessa não está aqui — está
// na base de dados, que não deixa uma mensagem de professor sair para
// fora da lista de quem tem matrícula confirmada com ele.
//
// Continua a ser de sentido único. Um aluno que precise de responder tem
// os caminhos que já existiam: desmarcar, pedir reposição, responder a
// uma proposta de horário.
export default async function ProfessorMensagensPage() {
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }
  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const [alunos, { data: historicoData }] = await Promise.all([
    carregarAlunosAlvo(supabase, user.id),
    supabase
      .from('mensagens_escola')
      .select('id, assinatura, corpo, publico, filtro, programa, destinatarios, criado_em')
      .eq('autor_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(20),
  ])

  const historico = (historicoData ?? []) as unknown as MensagemEnviada[]

  return (
    <main id="conteudo-principal" className="pinterest-mensagens">
      <div className="pinterest-mensagens-folha">
        <header className="pinterest-mensagens-cabecalho">
          <VoltarAtras destino="/dashboard" className="pinterest-mensagens-voltar" rotulo="Voltar ao início" tamanho={24} />
          <div>
            <h1>Mensagens</h1>
            <p>Escreve diretamente às famílias dos teus alunos.</p>
          </div>
        </header>

        {alunos.length === 0 ? (
          <EmptyState
            titulo="Ainda não tens alunos"
            descricao="Podes escrever assim que tiveres a primeira matrícula confirmada."
          />
        ) : (
          <section className="mensagens-nova" aria-label="Escrever uma mensagem">
            <header className="pinterest-mensagens-seccao-titulo"><span><Send size={18} aria-hidden="true" /></span><div><h2>Nova mensagem</h2><p>Escolhe quem recebe e revê antes de enviar</p></div></header>
            <MensagemEscolaForm
              admin={false}
              nomeAutor={profile.nome}
              professores={[]}
              alunos={alunos}
            />
          </section>
        )}

        {historico.length > 0 && (
          <section className="mensagens-historico" aria-labelledby="historico-titulo">
            <header>
              <span><History size={18} aria-hidden="true" /></span>
              <div><h2 id="historico-titulo">Enviadas</h2><p>As últimas 20 mensagens</p></div>
            </header>
            <div className="pinterest-mensagens-historico-lista">
              {historico.map((m) => (
                <article key={m.id}>
                  <span>
                    {new Date(m.criado_em).toLocaleDateString('pt-PT')} · {descreverAlvo(m)} ·{' '}
                    {m.destinatarios} {m.destinatarios === 1 ? 'pessoa' : 'pessoas'}
                  </span>
                  <p className="mensagens-historico-corpo">{m.corpo}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
