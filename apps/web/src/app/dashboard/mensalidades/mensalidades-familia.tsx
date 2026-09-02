import Link from 'next/link'
import { EmptyState } from '@/components/empty-state'
import { MensagemNota } from '@/components/mensagem'
import { MESES_ANO_LETIVO, estadoMensalidade, euros, type EstadoMensalidade } from '@ccg/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CheckCircle2, Clock3, ReceiptText } from 'lucide-react'
import { VoltarAtras } from '@/components/voltar-atras'

// O que a família tem a pagar, mês a mês.
//
// Esta página é a razão de ser da migração 0044. Até aqui o valor de uma
// mensalidade só existia dentro do texto de um aviso — e um número dentro
// de uma notificação fica congelado no telemóvel de quem a recebeu. Se a
// secretaria corrigir o valor no dia 3 (um aluno que entrou a meio do mês
// e paga metade), a mensagem do dia 1 continua a dizer o valor antigo,
// para sempre.
//
// Aqui não: a página lê a linha de hoje. É por isso que os avisos de
// mensalidade deixaram de levar números e passaram a apontar para cá.
//
// O valor vem repartido — mensalidade, acréscimo, inscrição, seguro — em
// vez de ser um total afirmado. Quem recebe uma conta de 70 € onde
// esperava 50 € tem direito a ver de onde vieram os outros 20.

type Linha = {
  id: number
  aluno_id: string
  valor: number | null
  desconto: number | null
  acrescimo: number | null
  inscricao: number | null
  seguro: number | null
  pago: boolean
  desistencia: boolean
  beneficio_id: number | null
  instrumento_nome: string | null
}

const ESTADO: Record<EstadoMensalidade, string> = {
  nao_devida: 'Não devida · Programa de Recomendação',
  paga: 'Paga',
  por_pagar: 'Por pagar',
  por_gerar: 'Ainda não gerada',
  desistencia: 'Desistiu',
}

export async function MensalidadesFamilia({
  supabase,
  userId,
  escolhido,
}: {
  supabase: SupabaseClient
  userId: string
  escolhido: { ano: number; mes: number; label: string }
}) {
  const [{ data: alunosData }, { data: mensalidadesData }] = await Promise.all([
    supabase.from('alunos').select('id, nome').eq('encarregado_id', userId).order('criado_em'),
    supabase
      .from('mensalidades')
      .select(
        'id, aluno_id, valor, desconto, acrescimo, inscricao, seguro, pago, desistencia, beneficio_id, instrumento_nome'
      )
      .eq('ano', escolhido.ano)
      .eq('mes', escolhido.mes),
  ])

  const alunos = (alunosData ?? []) as { id: string; nome: string }[]
  // A RLS já limita estas linhas aos educandos desta conta (0044). O
  // agrupamento aqui é só para as arrumar por nome.
  const linhas = (mensalidadesData ?? []) as Linha[]
  const nomePorAluno = new Map(alunos.map((a) => [a.id, a.nome]))

  const porPagar = linhas.filter((l) => estadoMensalidade(l) === 'por_pagar')
  const total = porPagar.reduce((soma, l) => soma + (l.valor ?? 0), 0)

  return (
    <main id="conteudo-principal" className="pinterest-mensalidades">
      <div className="pinterest-mensalidades-folha">
        <header className="pinterest-mensalidades-cabecalho">
          <VoltarAtras destino="/dashboard" className="pinterest-mensalidades-voltar" rotulo="Voltar ao início" tamanho={23} />
          <div>
            <h1>Mensalidades</h1>
            <p>Pagamentos da família</p>
          </div>
        </header>

        <section className="pinterest-mensalidades-resumo" data-em-dia={total === 0} aria-label={`Resumo de ${escolhido.label}`}>
          <span aria-hidden="true"><ReceiptText size={22} /></span>
          <div>
            <small>{total > 0 ? `Por pagar em ${escolhido.label.toLowerCase()}` : `${escolhido.label} está em dia`}</small>
            <strong>{euros(total)}</strong>
            <p>{total > 0 ? `${porPagar.length} ${porPagar.length === 1 ? 'mensalidade pendente' : 'mensalidades pendentes'}` : 'Não tens pagamentos pendentes neste mês'}</p>
          </div>
        </section>

        <nav className="pinterest-mensalidades-meses" aria-label="Escolher o mês">
          {MESES_ANO_LETIVO.map((m) => (
            <Link
              key={`${m.ano}-${m.mes}`}
              href={`/dashboard/mensalidades?ano=${m.ano}&mes=${m.mes}`}
              aria-current={
                m.ano === escolhido.ano && m.mes === escolhido.mes ? 'page' : undefined
              }
            >
              {m.label.slice(0, 3)}
            </Link>
          ))}
        </nav>

        {linhas.length === 0 ? (
          <EmptyState
            titulo={`Sem mensalidades em ${escolhido.label.toLowerCase()}`}
            descricao="As mensalidades de cada mês são geradas no dia 1."
          />
        ) : (
          <section aria-labelledby="mensalidades-detalhe-titulo">
            <header className="pinterest-mensalidades-seccao">
              <h2 id="mensalidades-detalhe-titulo">Detalhe do mês</h2>
              <span>{linhas.length}</span>
            </header>
            <div className="mensalidade-lista" aria-label="Mensalidades do mês">
            {linhas.map((l) => {
              const estado = estadoMensalidade(l)
              // As parcelas que não são a mensalidade em si. Só aparecem
              // quando existem — na maior parte dos meses não existe
              // nenhuma, e uma lista de zeros só faz a conta parecer mais
              // complicada do que é.
              const extras = [
                { nome: 'Acréscimo por atraso (20%)', valor: l.acrescimo ?? 0 },
                { nome: 'Inscrição', valor: l.inscricao ?? 0 },
                { nome: 'Seguro', valor: l.seguro ?? 0 },
              ].filter((e) => e.valor > 0)

              // A mensalidade cheia, antes de qualquer desconto: é o que
              // permite mostrar o desconto como uma linha própria em vez
              // de um número mais baixo sem explicação.
              const desconto = l.desconto ?? 0
              const mensalidade =
                (l.valor ?? 0) - extras.reduce((s, e) => s + e.valor, 0) + desconto

              return (
                <article key={l.id} data-estado={estado}>
                  <header>
                    <span className="lista-item-titulo">
                      {nomePorAluno.get(l.aluno_id) ?? 'Aluno'}
                    </span>
                    <span className="lista-item-sub">{l.instrumento_nome ?? ''}</span>
                  </header>

                  <dl className="mensalidade-parcelas">
                    <div>
                      <dt>Mensalidade</dt>
                      <dd>{euros(mensalidade)}</dd>
                    </div>
                    {desconto > 0 && (
                      <div className="mensalidade-desconto">
                        <dt>Desconto</dt>
                        <dd>−{euros(desconto)}</dd>
                      </div>
                    )}
                    {extras.map((e) => (
                      <div key={e.nome}>
                        <dt>{e.nome}</dt>
                        <dd>{euros(e.valor)}</dd>
                      </div>
                    ))}
                    <div className="mensalidade-total">
                      <dt>Total</dt>
                      <dd>{euros(l.valor ?? 0)}</dd>
                    </div>
                  </dl>

                  <p className="mensalidade-estado">
                    {estado === 'paga' || estado === 'nao_devida' ? <CheckCircle2 size={15} aria-hidden="true" /> : <Clock3 size={15} aria-hidden="true" />}
                    {ESTADO[estado]}
                  </p>
                </article>
              )
            })}
            </div>
          </section>
        )}

        <div className="pinterest-mensalidades-nota">
          <MensagemNota>
            O prazo de pagamento é até ao dia 8 de cada mês. O pagamento faz-se na secretaria
            ou por transferência bancária — o estado aqui muda assim que a secretaria o
            confirmar. Se algum valor não estiver certo, fala com a secretaria.
          </MensagemNota>
        </div>
      </div>
    </main>
  )
}
