import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubmitButton } from '@/components/submit-button'
import {
  validarRecomendacao,
  anularRecomendacao,
  atualizarDadosRecomendacao,
} from '@/lib/actions/recomendacoes'
import { MESES_ANO_LETIVO, euros } from '@ccg/core'

type Recomendacao = {
  id: number
  recomendador_nome: string
  novo_aluno_nome: string
  professor_nome: string
  modalidade: string | null
  data_inscricao: string | null
  data_primeiro_pagamento: string | null
  data_validacao: string | null
  valor_inscricao: number | null
  estado: string
  motivo_anulacao: string | null
  observacoes: string | null
  criado_em: string
}

type Beneficio = {
  id: number
  estado: string
  ano_uso: number | null
  mes_uso: number | null
  valor_coberto: number | null
  motivo_anulacao: string | null
}

const ESTADO_BENEFICIO_LABEL: Record<string, string> = {
  pendente: 'Por usar',
  usado: 'Usado',
  expirado: 'Expirado',
  anulado: 'Anulado',
}

function nomeDoMes(ano: number, mes: number) {
  return MESES_ANO_LETIVO.find((m) => m.ano === ano && m.mes === mes)?.label ?? `${mes}/${ano}`
}

export default async function RecomendacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ erro?: string }>
}) {
  const { id } = await params
  const { erro } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const { data: recomendacaoData } = await supabase
    .from('recomendacoes')
    .select(
      'id, recomendador_nome, novo_aluno_nome, professor_nome, modalidade, data_inscricao, data_primeiro_pagamento, valor_inscricao, data_validacao, estado, motivo_anulacao, observacoes, criado_em'
    )
    .eq('id', id)
    .maybeSingle()
  const recomendacao = recomendacaoData as Recomendacao | null

  if (!recomendacao) {
    notFound()
  }

  const { data: beneficiosData } = await supabase
    .from('beneficios')
    .select('id, estado, ano_uso, mes_uso, valor_coberto, motivo_anulacao')
    .eq('recomendacao_id', recomendacao.id)
  const beneficios = (beneficiosData ?? []) as Beneficio[]

  return (
    <main id="conteudo-principal" className="partitura-pagina recomendacao-detalhe-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><Link href="/admin/recomendacoes" className="partitura-voltar" aria-label="Voltar às recomendações">←</Link><div><p className="partitura-sobretitulo">{recomendacao.professor_nome}{recomendacao.modalidade && ` · ${recomendacao.modalidade}`}</p><h1>{recomendacao.recomendador_nome} <span aria-hidden="true">→</span> {recomendacao.novo_aluno_nome}</h1><p>Registada em {new Intl.DateTimeFormat('pt-PT').format(new Date(recomendacao.criado_em))}</p></div></header>

        {erro && (
          <p className="admin-alerta" role="alert">
            {decodeURIComponent(erro)}
          </p>
        )}

        <div className="recomendacao-detalhe-grelha"><div>
        <section className="recomendacao-seccao recomendacao-estado">
          <h2>Estado</h2>
          {recomendacao.estado === 'registada' && (
            <div className="space-y-3 rounded-[13px] border border-[var(--color-linha)] p-3">
              <p className="text-sm text-foreground/70">
                Por validar. Assim que for validada, o aluno{' '}
                <strong>{recomendacao.recomendador_nome}</strong> ganha uma mensalidade
                gratuita, que será aplicada automaticamente no mês seguinte (Art. 13.º).
              </p>
              <form action={validarRecomendacao}>
                <input type="hidden" name="id" value={recomendacao.id} />
                <SubmitButton
                  textoAGuardar="A validar…"
                  className="rounded-[13px] bg-[var(--color-azul-fundo)] px-4 py-2 text-[14px] font-semibold text-white"
                >
                  Validar e atribuir mês grátis
                </SubmitButton>
              </form>
            </div>
          )}
          {recomendacao.estado === 'validada' && (
            <p className="rounded-[13px] border border-[var(--color-linha)] p-3 text-[13px] text-[var(--color-tinta-suave)]">
              Validada em {recomendacao.data_validacao}.
            </p>
          )}
          {recomendacao.estado === 'anulada' && (
            <p className="rounded border border-red-600/30 p-3 text-sm text-red-600">
              Anulada — {recomendacao.motivo_anulacao}
            </p>
          )}
        </section>

        <section className="recomendacao-seccao">
          <h2>Mensalidade gratuita</h2>
          {beneficios.length === 0 ? (
            <p className="text-[13px] text-[var(--color-tinta-suave)]">
              Ainda não existe — só nasce quando a recomendação for validada.
            </p>
          ) : (
            <div className="space-y-2">
              {beneficios.map((b) => (
                <div key={b.id} className="lista-item">
                  <p className="lista-item-titulo">
                    {ESTADO_BENEFICIO_LABEL[b.estado] ?? b.estado}
                  </p>
                  <p className="lista-item-sub">
                    {b.estado === 'usado' && b.ano_uso && b.mes_uso && (
                      <>
                        Aplicada em {nomeDoMes(b.ano_uso, b.mes_uso)} de {b.ano_uso}
                        {b.valor_coberto !== null && ` — ${euros(b.valor_coberto)}`}
                      </>
                    )}
                    {b.estado === 'pendente' &&
                      'Será aplicada automaticamente no dia 1 do próximo mês.'}
                    {b.estado === 'expirado' && 'Não foi usada até ao fim do ano letivo.'}
                    {b.estado === 'anulado' && b.motivo_anulacao}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        </div><div>
        <section className="recomendacao-seccao">
          <h2>Dados administrativos</h2>
          <form
            action={atualizarDadosRecomendacao}
            className="space-y-3 rounded-[13px] border border-[var(--color-linha)] p-3"
          >
            <input type="hidden" name="id" value={recomendacao.id} />
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="dataInscricao"
                  className="block text-[12.5px] font-medium text-[var(--color-tinta-suave)]"
                >
                  Data de inscrição
                </label>
                <input
                  id="dataInscricao"
                  name="dataInscricao"
                  type="date"
                  defaultValue={recomendacao.data_inscricao ?? ''}
                  className="rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="dataPrimeiroPagamento"
                  className="block text-[12.5px] font-medium text-[var(--color-tinta-suave)]"
                >
                  Data do 1.º pagamento
                </label>
                <input
                  id="dataPrimeiroPagamento"
                  name="dataPrimeiroPagamento"
                  type="date"
                  defaultValue={recomendacao.data_primeiro_pagamento ?? ''}
                  className="rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="valorInscricao"
                  className="block text-[12.5px] font-medium text-[var(--color-tinta-suave)]"
                >
                  Valor da inscrição (€)
                </label>
                <input
                  id="valorInscricao"
                  name="valorInscricao"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={recomendacao.valor_inscricao ?? ''}
                  className="w-28 rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="modalidade"
                className="block text-[12.5px] font-medium text-[var(--color-tinta-suave)]"
              >
                Modalidade
              </label>
              <input
                id="modalidade"
                name="modalidade"
                defaultValue={recomendacao.modalidade ?? ''}
                className="w-full rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="observacoes"
                className="block text-[12.5px] font-medium text-[var(--color-tinta-suave)]"
              >
                Observações
              </label>
              <textarea
                id="observacoes"
                name="observacoes"
                rows={2}
                defaultValue={recomendacao.observacoes ?? ''}
                className="w-full rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
              />
            </div>
            <SubmitButton
              textoAGuardar="A guardar…"
              className="rounded-[13px] border border-[var(--color-linha)] px-3 py-2 text-[14px] font-medium text-[var(--color-azul-fundo)]"
            >
              Guardar correções
            </SubmitButton>
          </form>
        </section>

        {recomendacao.estado !== 'anulada' && (
          <section className="recomendacao-seccao recomendacao-perigo">
            <h2>Anular</h2>
            <p className="text-[13px] text-[var(--color-tinta-suave)]">
              Para erros administrativos (Art. 23.º), saída do professor (Art. 17.º) ou
              utilização abusiva (Art. 24.º). Uma mensalidade já usada não é revertida.
            </p>
            <form
              action={anularRecomendacao}
              className="flex flex-wrap items-end gap-2 rounded-[13px] border border-[var(--color-linha)] p-3"
            >
              <input type="hidden" name="id" value={recomendacao.id} />
              <div className="flex-1 space-y-1">
                <label htmlFor="motivo" className="block text-[12.5px] font-medium text-[var(--color-tinta-suave)]">
                  Motivo
                </label>
                <input
                  id="motivo"
                  name="motivo"
                  required
                  className="w-full rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
                />
              </div>
              <SubmitButton
                textoAGuardar="A anular…"
                className="rounded border border-red-600/40 px-3 py-2 text-sm text-red-600"
              >
                Anular
              </SubmitButton>
            </form>
          </section>
        )}</div></div>
      </div>
    </main>
  )
}
