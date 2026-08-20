import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/empty-state'
import {
  definirIsencaoCcg,
  definirValorMensal,
  marcarMensalidadePaga,
  definirNumeroFatura,
} from '@/lib/actions/pagamentos'

type MatriculaResumo = {
  id: number
  aluno_id: string
  valor_mensal: number | null
  isento_ccg: boolean
  aluno: { nome: string } | null
  instrumentos: { nome: string; programa: string } | null
}

type MensalidadeResumo = {
  matricula_id: number
  pago: boolean
  numero_fatura: string | null
  valor: number | null
}

export default async function ConfirmarMensalidadesProfessorPage({
  params,
  searchParams,
}: {
  params: Promise<{ professorId: string }>
  searchParams: Promise<{ erro?: string }>
}) {
  const { professorId } = await params
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

  const { data: professorPerfilData } = await supabase
    .from('perfis_escola')
    .select('profiles(nome)')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  const professorPerfil = professorPerfilData as { profiles: { nome: string } | null } | null

  if (!professorPerfil) {
    notFound()
  }

  const professorData = { nome: professorPerfil.profiles?.nome ?? '' }

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select(
      'id, aluno_id, valor_mensal, isento_ccg, aluno:alunos(nome), instrumentos(nome, programa)'
    )
    .eq('professor_id', professorId)
    .eq('estado', 'confirmado')
  const matriculas = (matriculasData ?? []) as unknown as MatriculaResumo[]

  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth() + 1

  const matriculaIds = matriculas.map((m) => m.id)
  const { data: mensalidadesData } =
    matriculaIds.length > 0
      ? await supabase
          .from('mensalidades')
          .select('matricula_id, pago, numero_fatura, valor')
          .eq('ano', ano)
          .eq('mes', mes)
          .in('matricula_id', matriculaIds)
      : { data: [] }
  const mensalidadePorMatricula = new Map(
    ((mensalidadesData ?? []) as MensalidadeResumo[]).map((m) => [m.matricula_id, m])
  )

  // Os preços de tabela (0044). Desde essa migração, a esmagadora maioria
  // das matrículas não escreve valor nenhum por cima — o preço vem daqui,
  // e sem isto o botão "Marcar como pago" ficava desativado para toda a
  // gente, à espera de um valor que já ninguém tem de escrever.
  const { data: taxasData } = await supabase.from('taxas_escola').select('programa, mensalidade')
  const precoPorPrograma = new Map(
    ((taxasData ?? []) as { programa: string; mensalidade: number | null }[]).map((t) => [
      t.programa,
      t.mensalidade,
    ])
  )

  // O que a família paga por esta matrícula, por ordem de autoridade: o
  // que já ficou gravado na mensalidade deste mês manda sobre tudo (é lá
  // que a secretaria corrige um meio mês), depois o valor próprio da
  // matrícula, e por fim o preço de tabela da escola.
  function valorEfetivo(m: MatriculaResumo): number | null {
    const gravado = mensalidadePorMatricula.get(m.id)?.valor
    if (gravado != null) return gravado
    if (m.valor_mensal != null) return m.valor_mensal
    return precoPorPrograma.get(m.instrumentos?.programa ?? '') ?? null
  }

  // Só os que ainda faltam confirmar (não pagos este mês) — assim que
  // marcados como pagos, desaparecem desta lista.
  const porConfirmar = matriculas
    .filter((m) => !(mensalidadePorMatricula.get(m.id)?.pago ?? false))
    .sort((a, b) => (a.aluno?.nome ?? '').localeCompare(b.aluno?.nome ?? ''))

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-cobranca-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><Link href="/admin/pagamentos/confirmar" className="partitura-voltar" aria-label="Voltar à lista de confirmações">←</Link><div><p className="partitura-sobretitulo">Mensalidades · {String(mes).padStart(2, '0')}/{ano}</p><h1>{professorData.nome}</h1><p>{porConfirmar.length} {porConfirmar.length === 1 ? 'pagamento por confirmar' : 'pagamentos por confirmar'}</p></div></header>

        {erro && <p className="admin-alerta" role="alert">{decodeURIComponent(erro)}</p>}

        {porConfirmar.length === 0 ? (
          <EmptyState
            titulo="Não há mensalidades por confirmar este mês"
            descricao="Está tudo em dia."
          />
        ) : (
          <section className="admin-cobrancas" aria-label="Pagamentos por confirmar">
            {porConfirmar.map((m) => {
              const numeroFatura = mensalidadePorMatricula.get(m.id)?.numero_fatura ?? ''
              const valor = valorEfetivo(m)
              return (
                <article key={m.id} className="admin-cobranca">
                  <div>
                    <p className="lista-item-titulo">{m.aluno?.nome}</p>
                    <p className="lista-item-sub">{m.instrumentos?.nome}</p>
                  </div>

                  {/* A ordem do cartão segue a ordem do trabalho: definir o
                      valor, registar a fatura, e só depois dar por pago.
                      Estava ao contrário — "Marcar como pago" vinha primeiro,
                      desativado, antes do campo que o desbloqueia. Quem
                      chegava via a ação principal morta sem nada a explicar
                      porquê. */}
                  <form action={definirValorMensal} className="flex items-center gap-2">
                    <input type="hidden" name="matriculaId" value={m.id} />
                    <label htmlFor={`valor-${m.id}`} className="text-xs text-foreground/60">
                      Valor mensal (€)
                    </label>
                    <input
                      id={`valor-${m.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      name="valor"
                      defaultValue={m.valor_mensal ?? ''}
                      placeholder={String(precoPorPrograma.get(m.instrumentos?.programa ?? '') ?? '')}
                      className="w-24 rounded-[10px] border border-[var(--color-linha)] px-2 py-1 text-[13px] text-[var(--color-tinta)]"
                    />
                    <button
                      type="submit"
                      className="rounded-[10px] border border-[var(--color-linha)] px-2 py-1 text-[11px] font-medium text-[var(--color-azul-fundo)]"
                    >
                      Guardar
                    </button>
                  </form>

                  {/* Voluntários do rancho e afins: não pagam os 10 € que
                      vão para o CCG. Fica aqui, ao lado do valor, porque é
                      a mesma pergunta — quanto é que esta pessoa paga. */}
                  <form action={definirIsencaoCcg} className="flex items-center gap-2">
                    <input type="hidden" name="matriculaId" value={m.id} />
                    <input type="hidden" name="isento" value={String(!m.isento_ccg)} />
                    <span className="text-xs text-foreground/60">
                      {m.isento_ccg ? 'Isento dos 10 € do CCG' : 'Paga os 10 € do CCG'}
                    </span>
                    <button
                      type="submit"
                      className="rounded-[10px] border border-[var(--color-linha)] px-2 py-1 text-[11px] font-medium text-[var(--color-azul-fundo)]"
                    >
                      {m.isento_ccg ? 'Retirar isenção' : 'Isentar'}
                    </button>
                  </form>

                  <form action={definirNumeroFatura} className="flex items-center gap-2">
                    <input type="hidden" name="matriculaId" value={m.id} />
                    <input type="hidden" name="alunoId" value={m.aluno_id} />
                    <input type="hidden" name="professorId" value={professorId} />
                    <input
                      type="hidden"
                      name="instrumentoNome"
                      value={m.instrumentos?.nome ?? ''}
                    />
                    <input type="hidden" name="ano" value={ano} />
                    <input type="hidden" name="mes" value={mes} />
                    <input type="hidden" name="valor" value={valor ?? 0} />
                    <input type="hidden" name="pago" value="false" />
                    <label htmlFor={`fatura-${m.id}`} className="text-xs text-foreground/60">Nº fatura</label>
                    <input
                      id={`fatura-${m.id}`}
                      type="text"
                      name="numeroFatura"
                      defaultValue={numeroFatura}
                      placeholder="ex: FT 2026/123"
                      className="w-32 rounded-[10px] border border-[var(--color-linha)] px-2 py-1 text-[13px] text-[var(--color-tinta)]"
                    />
                    <button
                      type="submit"
                      className="rounded-[10px] border border-[var(--color-linha)] px-2 py-1 text-[11px] font-medium text-[var(--color-azul-fundo)]"
                    >
                      Guardar
                    </button>
                  </form>

                  <form action={marcarMensalidadePaga} className="admin-cobranca-pago">
                    <input type="hidden" name="matriculaId" value={m.id} />
                    <input type="hidden" name="alunoId" value={m.aluno_id} />
                    <input type="hidden" name="professorId" value={professorId} />
                    <input
                      type="hidden"
                      name="instrumentoNome"
                      value={m.instrumentos?.nome ?? ''}
                    />
                    <input type="hidden" name="ano" value={ano} />
                    <input type="hidden" name="mes" value={mes} />
                    <input type="hidden" name="valor" value={valor ?? 0} />
                    <input type="hidden" name="pago" value="true" />
                    <input type="hidden" name="numeroFatura" value={numeroFatura} />
                    <button
                      type="submit"
                      disabled={valor === null}
                      className="rounded-[13px] border border-[var(--color-linha)] px-3 py-[6px] text-[13px] font-medium text-[var(--color-tinta)] disabled:opacity-45"
                    >
                      Marcar como pago
                    </button>
                    {/* Um botão desativado sem explicação é um beco: vê-se
                        que não dá, não se vê o que fazer para dar. */}
                    {valor === null && (
                      <p className="mt-[6px] text-xs text-foreground/60">
                        Esta disciplina não tem preço de tabela. Define o valor mensal para
                        poder marcar como pago.
                      </p>
                    )}
                  </form>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
