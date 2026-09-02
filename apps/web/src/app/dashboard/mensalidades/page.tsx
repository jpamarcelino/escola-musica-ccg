import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { ehContaCCG } from '@/lib/navegacao'
import { MensalidadesFamilia } from './mensalidades-familia'
import { EmptyState } from '@/components/empty-state'
import { MensagemInfo } from '@/components/mensagem'
import { MESES_ANO_LETIVO, euros, eurosOuTexto, parteDoProfessor } from '@ccg/core'
import { VoltarAtras } from '@/components/voltar-atras'
import { ChevronLeft, ReceiptText, WalletCards } from 'lucide-react'

type MatriculaDoProfessor = {
  id: number
  aluno_id: string
  instrumento_id: number | null
  valor_mensal: number | null
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
}

type MensalidadeDoMes = {
  aluno_id: string
  instrumento_id: number | null
  valor: number | null
  retencao_ccg: number | null
  inscricao: number | null
  seguro: number | null
  acrescimo: number | null
  pago: boolean
  desistencia: boolean
  beneficio_id: number | null
  instrumento_nome: string | null
}

type EstadoLinha = 'nao_devida' | 'paga' | 'por_pagar' | 'por_gerar' | 'desistencia'

const ESTADO: Record<EstadoLinha, { label: string }> = {
  nao_devida: { label: 'Não devida · Recomendação' },
  paga: { label: 'Paga' },
  por_pagar: { label: 'Por pagar' },
  por_gerar: { label: 'Ainda não gerada' },
  desistencia: { label: 'Desistiu' },
}

function mesPredefinido() {
  const agora = new Date()
  const chave = agora.getFullYear() * 12 + agora.getMonth() + 1
  const dentroDoAno = MESES_ANO_LETIVO.find((m) => m.ano * 12 + m.mes === chave)
  return dentroDoAno ?? MESES_ANO_LETIVO[0]
}

// Fora do ano letivo a página abre no primeiro mês da lista, e em agosto
// isso quer dizer abrir em setembro — um mês que ainda não chegou, com
// tudo a zero. Sem explicação, lê-se como se o mês corrente tivesse
// desaparecido.
function foraDoAnoLetivo() {
  const agora = new Date()
  const chave = agora.getFullYear() * 12 + agora.getMonth() + 1
  return !MESES_ANO_LETIVO.some((m) => m.ano * 12 + m.mes === chave)
}

export default async function MensalidadesProfessorPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const { ano: anoParam, mes: mesParam } = await searchParams

  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
  }

  const escolhido =
    MESES_ANO_LETIVO.find(
      (m) => String(m.ano) === anoParam && String(m.mes) === mesParam
    ) ?? mesPredefinido()

  // O papel decide-se antes de tudo, e sozinho: a mesma rota serve a
  // família e o professor, e as consultas de um não fazem sentido para o
  // outro. Era mais rápido pedir tudo ao mesmo tempo — e pedia-se a uma
  // família as matrículas de um professor que ela não é.
  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('tipo, adere_recomendacao, programa')
    .eq('id', user.id)
    .single()

  if (ehContaCCG(perfilAtual?.tipo)) {
    return (
      <MensalidadesFamilia supabase={supabase} userId={user.id} escolhido={escolhido} />
    )
  }

  if (perfilAtual?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const [{ data: matriculasData }, { data: mensalidadesData }] =
    await Promise.all([
      supabase
        .from('matriculas')
        .select('id, aluno_id, instrumento_id, valor_mensal, alunos(nome), instrumentos(nome)')
        .eq('professor_id', user.id)
        .eq('estado', 'confirmado'),
      supabase
        .from('mensalidades')
        .select('aluno_id, instrumento_id, valor, retencao_ccg, inscricao, seguro, acrescimo, pago, desistencia, beneficio_id, instrumento_nome')
        .eq('professor_id', user.id)
        .eq('ano', escolhido.ano)
        .eq('mes', escolhido.mes),
    ])

  // A retenção em vigor na escola deste professor, para as linhas que
  // ainda não têm mensalidade gerada. As que já têm trazem a sua, que é
  // a que valeu naquele mês.
  const { data: taxas } = await supabase
    .from('taxas_escola')
    .select('retencao_ccg, mensalidade')
    .eq('programa', perfilAtual?.programa ?? '')
    .maybeSingle()
  const retencaoDaEscola = taxas?.retencao_ccg ?? 0
  // O preço de tabela da escola (0044). Serve as linhas cuja matrícula
  // não escreve nenhum valor por cima — que desde a 0044 são a maioria.
  const precoDaEscola = taxas?.mensalidade ?? null

  const matriculas = (matriculasData ?? []) as unknown as MatriculaDoProfessor[]
  const mensalidades = (mensalidadesData ?? []) as MensalidadeDoMes[]

  // A identidade de uma mensalidade passou a incluir a disciplina (0045):
  // um aluno com Piano e Bateria com o mesmo professor tem duas
  // mensalidades por mês, e mapeá-las só pelo aluno perdia uma delas —
  // que era exatamente o erro que a 0045 foi corrigir.
  const mensalidadePorAluno = new Map(
    mensalidades.map((m) => [`${m.aluno_id}:${m.instrumento_id ?? 0}`, m])
  )

  const linhas = matriculas
    .map((m) => {
      const mensalidade = mensalidadePorAluno.get(`${m.aluno_id}:${m.instrumento_id ?? 0}`)
      let estado: EstadoLinha
      if (!mensalidade) estado = 'por_gerar'
      else if (mensalidade.desistencia) estado = 'desistencia'
      else if (mensalidade.beneficio_id !== null) estado = 'nao_devida'
      else if (mensalidade.pago) estado = 'paga'
      else estado = 'por_pagar'

      return {
        chave: m.id,
        nome: m.alunos?.nome ?? '',
        disciplina: m.instrumentos?.nome ?? mensalidade?.instrumento_nome ?? '',
        // O que entra ao professor, e não o que a família paga: uma
        // parte da mensalidade é do CCG. Enquanto a mensalidade do mês
        // não existe, usa-se a retenção que a mensalidade mais recente
        // trouxe — e na falta dela, a da escola.
        valor: parteDoProfessor(
          mensalidade ?? {
            // Enquanto a mensalidade do mês não existe, mostra-se o que
            // ela virá a dar: o preço da matrícula (ou o de tabela) menos
            // a retenção em vigor. Sem inscrição nem seguro — esses são
            // da escola e nunca entram nesta conta.
            valor: m.valor_mensal ?? precoDaEscola,
            retencao_ccg: retencaoDaEscola,
          }
        ),
        estado,
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const naoDevidas = linhas.filter((l) => l.estado === 'nao_devida')
  const porPagar = linhas.filter((l) => l.estado === 'por_pagar')
  const pagas = linhas.filter((l) => l.estado === 'paga')
  const totalPorReceber = porPagar.reduce((total, linha) => total + (linha.valor ?? 0), 0)
  const totalDoMes = linhas
    .filter((linha) => linha.estado !== 'nao_devida' && linha.estado !== 'desistencia')
    .reduce((total, linha) => total + (linha.valor ?? 0), 0)

  return (
    <main id="conteudo-principal" className="pinterest-mensalidades-professor">
      <div className="pinterest-mensalidades-professor-folha">
        <header className="pinterest-mensalidades-professor-cabecalho">
          <VoltarAtras destino="/dashboard" className="pinterest-mensalidades-professor-voltar" rotulo="Voltar ao início"><ChevronLeft size={24} aria-hidden="true" /></VoltarAtras>
          <div><h1>Mensalidades</h1><p>{escolhido.label} de {escolhido.ano}{foraDoAnoLetivo() ? ` · ano letivo começa em ${MESES_ANO_LETIVO[0].label.toLowerCase()}` : ''}</p></div>
        </header>

        <nav
          aria-label="Escolher mês"
          className="pinterest-mensalidades-professor-meses"
        >
          {MESES_ANO_LETIVO.map((m) => (
            <Link
              key={`${m.ano}-${m.mes}`}
              href={`/dashboard/mensalidades?ano=${m.ano}&mes=${m.mes}`}
              className={m.ano === escolhido.ano && m.mes === escolhido.mes ? 'ativo' : undefined}
              aria-current={m.ano === escolhido.ano && m.mes === escolhido.mes ? 'page' : undefined}
            >
              {m.label.slice(0, 3)} {String(m.ano).slice(-2)}
            </Link>
          ))}
        </nav>

        <section className="mensalidades-resumo" aria-label="Resumo do mês">
          <span aria-hidden="true"><WalletCards size={21} /></span>
          <div className="mensalidades-total">
            <p>Por receber</p>
            <strong>{euros(totalPorReceber)}</strong>
            {/* Dito uma vez, aqui, e não repetido em cada linha: os
                valores desta página são já a parte do professor. Sem
                esta frase, quem soubesse que a mensalidade é 50 ficava
                a olhar para 40 sem perceber de onde vem a diferença. */}
            <small>
              de {euros(totalDoMes)} previstos · já sem a parte do CCG
            </small>
          </div>
          <dl>
            <div><dt>Pagas</dt><dd>{pagas.length}</dd></div>
            <div><dt>Por pagar</dt><dd>{porPagar.length}</dd></div>
            <div><dt>Não devidas</dt><dd>{naoDevidas.length}</dd></div>
          </dl>
        </section>

        {naoDevidas.length > 0 && (
          <MensagemInfo>
            {naoDevidas.length === 1
              ? 'Uma das mensalidades deste mês está abrangida pelo Programa de Recomendação — não há pagamento a receber por ela'
              : `${naoDevidas.length} mensalidades deste mês estão abrangidas pelo Programa de Recomendação — não há pagamento a receber por elas`}
            , porque a tua parcela e a do CCG foram oferecidas ao aluno que trouxe um novo
            aluno para as tuas aulas.
          </MensagemInfo>
        )}

        {linhas.length === 0 ? (
          <EmptyState titulo="Não tens alunos com matrícula confirmada" />
        ) : (
          <section className="mensalidades-extrato" aria-labelledby="extrato-titulo">
            <header><span><ReceiptText size={18} aria-hidden="true" /></span><div><h2 id="extrato-titulo">Movimentos do mês</h2><p>{linhas.length} {linhas.length === 1 ? 'mensalidade' : 'mensalidades'}</p></div></header>
            <div>
            {linhas.map((l) => (
              <article key={l.chave} data-estado={l.estado}>
                <span><strong>{l.nome}</strong><small>{l.disciplina}</small></span>
                <b>{l.estado === 'nao_devida' ? euros(0) : eurosOuTexto(l.valor, '—')}</b>
                <em>{ESTADO[l.estado].label}</em>
              </article>
            ))}
            </div>
          </section>
        )}

        {!perfilAtual.adere_recomendacao && (
          <p className="pinterest-mensalidades-professor-nota">
            Não aderiste ao Programa de Recomendação, por isso nenhuma das tuas mensalidades
            será abrangida. A adesão faz-se junto da secretaria.
          </p>
        )}
      </div>
    </main>
  )
}
