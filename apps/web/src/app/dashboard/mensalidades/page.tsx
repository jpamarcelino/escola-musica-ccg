import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { EmptyState } from '@/components/empty-state'
import { MensagemInfo } from '@/components/mensagem'
import { MESES_ANO_LETIVO, euros, eurosOuTexto, parteDoProfessor } from '@ccg/core'

type MatriculaDoProfessor = {
  id: number
  aluno_id: string
  valor_mensal: number | null
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
}

type MensalidadeDoMes = {
  aluno_id: string
  valor: number | null
  retencao_ccg: number | null
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

  const [{ data: perfilAtual }, { data: matriculasData }, { data: mensalidadesData }] =
    await Promise.all([
      supabase
        .from('perfis_escola')
        .select('tipo, adere_recomendacao, programa')
        .eq('id', user.id)
        .single(),
      supabase
        .from('matriculas')
        .select('id, aluno_id, valor_mensal, alunos(nome), instrumentos(nome)')
        .eq('professor_id', user.id)
        .eq('estado', 'confirmado'),
      supabase
        .from('mensalidades')
        .select('aluno_id, valor, retencao_ccg, pago, desistencia, beneficio_id, instrumento_nome')
        .eq('professor_id', user.id)
        .eq('ano', escolhido.ano)
        .eq('mes', escolhido.mes),
    ])

  if (perfilAtual?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  // A retenção em vigor na escola deste professor, para as linhas que
  // ainda não têm mensalidade gerada. As que já têm trazem a sua, que é
  // a que valeu naquele mês.
  const { data: taxas } = await supabase
    .from('taxas_escola')
    .select('retencao_ccg')
    .eq('programa', perfilAtual?.programa ?? '')
    .maybeSingle()
  const retencaoDaEscola = taxas?.retencao_ccg ?? 0

  const matriculas = (matriculasData ?? []) as unknown as MatriculaDoProfessor[]
  const mensalidades = (mensalidadesData ?? []) as MensalidadeDoMes[]

  // A identidade de uma mensalidade é (aluno, professor, ano, mês) desde
  // a 0008 — não a matrícula. Por isso a chave aqui é o aluno.
  const mensalidadePorAluno = new Map(mensalidades.map((m) => [m.aluno_id, m]))

  const linhas = matriculas
    .map((m) => {
      const mensalidade = mensalidadePorAluno.get(m.aluno_id)
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
          mensalidade?.valor ?? m.valor_mensal,
          mensalidade?.retencao_ccg ?? retencaoDaEscola
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
    <main id="conteudo-principal" className="partitura-pagina mensalidades-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">←</Link>
          <div><p className="partitura-sobretitulo">Extrato mensal</p><h1>Mensalidades</h1><p>{escolhido.label} de {escolhido.ano}{foraDoAnoLetivo() ? ` — o ano letivo ${MESES_ANO_LETIVO[0].ano}/${String((MESES_ANO_LETIVO[0].ano + 1) % 100).padStart(2, '0')} começa em ${MESES_ANO_LETIVO[0].label.toLowerCase()}` : ''}</p></div>
        </header>

        <nav
          aria-label="Escolher mês"
          className="mensalidades-meses"
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
            <header><p className="partitura-indice">01</p><h2 id="extrato-titulo">Movimentos do mês</h2></header>
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
          <p className="text-sm text-foreground/60">
            Não aderiste ao Programa de Recomendação, por isso nenhuma das tuas mensalidades
            será abrangida. A adesão faz-se junto da secretaria.
          </p>
        )}
      </div>
    </main>
  )
}
