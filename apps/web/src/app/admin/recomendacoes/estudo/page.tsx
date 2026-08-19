import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { recolherDadosEstudo, recolherDesempenhoPorProfessor } from '@ccg/data'
import { euros } from '@ccg/core'

// Uma casa decimal: "4,3 alunos" diz mais do que "4", e menos do que
// uma precisão que estes números não têm.
function media(valores: number[]): string {
  if (valores.length === 0) return '—'
  return (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1).replace('.', ',')
}

function mediaBruta(valores: number[]): number {
  if (valores.length === 0) return 0
  return valores.reduce((a, b) => a + b, 0) / valores.length
}

export default async function EstudoRecomendacoesPage() {
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

  const [{ linhas, totais }, desempenho] = await Promise.all([
    recolherDadosEstudo(supabase),
    recolherDesempenhoPorProfessor(supabase),
  ])

  // §19 da proposta: o resultado líquido é a receita nova gerada (as
  // inscrições mais as mensalidades pagas pelos novos alunos) menos o
  // custo das mensalidades oferecidas.
  const receitaNova = totais.valorInscricoes + totais.valorSeguros + totais.receitaNovosAlunos
  const resultadoLiquido = receitaNova - totais.valorBeneficios

  const grupoAderentes = desempenho.filter((p) => p.aderente)
  const grupoNaoAderentes = desempenho.filter((p) => !p.aderente)

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-4xl space-y-8">
        <PageHeader voltar="/admin/recomendacoes" titulo="Dados para o estudo" subtitulo="Art. 30.º do Regulamento — base do relatório final do ano letivo." />

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="stat-tile">
            <p className="stat-tile-numero">{totais.recomendacoes}</p>
            <p className="stat-tile-legenda">Recomendações</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totais.validadas}</p>
            <p className="stat-tile-legenda">Convertidas em inscrições</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totais.professoresAbrangidos}</p>
            <p className="stat-tile-legenda">Professores abrangidos</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totais.desistencias}</p>
            <p className="stat-tile-legenda">Desistências</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totais.beneficiosUsados}</p>
            <p className="stat-tile-legenda">Mensalidades dadas</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totais.beneficiosPendentes}</p>
            <p className="stat-tile-legenda">Por usar</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totais.beneficiosExpirados}</p>
            <p className="stat-tile-legenda">Expiradas</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{totais.anuladas}</p>
            <p className="stat-tile-legenda">Anuladas</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="secao-titulo">Balanço financeiro</h2>
          <div className="space-y-2">
            <div className="lista-item flex items-center justify-between gap-3">
              <p className="lista-item-titulo">Valor das inscrições geradas</p>
              <p className="lista-item-sub">{euros(totais.valorInscricoes)}</p>
            </div>
            <div className="lista-item flex items-center justify-between gap-3">
              <p className="lista-item-titulo">Seguros pagos pelos novos alunos</p>
              <p className="lista-item-sub">{euros(totais.valorSeguros)}</p>
            </div>
            <div className="lista-item flex items-center justify-between gap-3">
              <p className="lista-item-titulo">Mensalidades pagas pelos novos alunos</p>
              <p className="lista-item-sub">{euros(totais.receitaNovosAlunos)}</p>
            </div>
            <div className="lista-item flex items-center justify-between gap-3">
              <p className="lista-item-titulo">Custo das mensalidades oferecidas</p>
              <p className="lista-item-sub">− {euros(totais.valorBeneficios)}</p>
            </div>
            <div className="lista-item flex items-center justify-between gap-3">
              <p className="lista-item-titulo">Resultado líquido adicional</p>
              <p className="lista-item-sub">
                {resultadoLiquido >= 0 ? '+' : ''}
                {euros(resultadoLiquido)}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="secao-titulo">Aderentes e não aderentes</h2>
          <p className="text-sm text-foreground/60">
            §28 da proposta. Em cima, o retrato dos dois grupos; em baixo, professor a
            professor. É esta comparação que responde à pergunta do projeto-piloto —
            aderir compensa?
          </p>

          {/* Média por professor, e não total: os dois grupos podem ter
              tamanhos muito diferentes, e comparar somas diria mais sobre
              quantos são do que sobre como lhes correu. */}
          <div className="estudo-comparacao">
            {[
              { titulo: 'Aderentes', grupo: grupoAderentes },
              { titulo: 'Não aderentes', grupo: grupoNaoAderentes },
            ].map(({ titulo, grupo }) => (
              <div key={titulo} className="estudo-comparacao-coluna">
                <h3>
                  {titulo} <span>{grupo.length === 1 ? '1 professor' : `${grupo.length} professores`}</span>
                </h3>
                {grupo.length === 0 ? (
                  <p className="estudo-vazio">Nenhum.</p>
                ) : (
                  <dl>
                    <div>
                      <dt>Alunos por professor</dt>
                      <dd>{media(grupo.map((p) => p.alunosAtivos))}</dd>
                    </div>
                    <div>
                      <dt>Alunos novos no último ano</dt>
                      <dd>{media(grupo.map((p) => p.alunosNovosUltimoAno))}</dd>
                    </div>
                    <div>
                      <dt>Receita por professor</dt>
                      <dd>{euros(mediaBruta(grupo.map((p) => p.receitaPaga)))}</dd>
                    </div>
                  </dl>
                )}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-linha)]">
                  <th className="p-2">Professor</th>
                  <th className="p-2">Programa</th>
                  <th className="p-2">Alunos</th>
                  <th className="p-2">Novos (1 ano)</th>
                  <th className="p-2">Desde a adesão</th>
                  <th className="p-2">Recomendações</th>
                  <th className="p-2">Meses dados</th>
                  <th className="p-2">Receita</th>
                  <th className="p-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {desempenho.map((p) => (
                  <tr key={p.professorId} className="border-b border-[var(--color-linha)]">
                    <td className="p-2">
                      {p.nome}
                      {p.aderente && <span className="estudo-marca">aderente</span>}
                    </td>
                    <td className="p-2">{p.programa ?? '—'}</td>
                    <td className="p-2">{p.alunosAtivos}</td>
                    <td className="p-2">{p.alunosNovosUltimoAno}</td>
                    {/* Um traço, e não um zero: quem não aderiu não tem
                        "desde a adesão" nenhum, e um zero leria-se como
                        "aderiu e não cresceu". */}
                    <td className="p-2">{p.alunosDesdeAdesao ?? '—'}</td>
                    <td className="p-2">{p.recomendacoesValidadas}</td>
                    <td className="p-2">
                      {p.mesesGratisDados}
                      {p.custoMesesGratis > 0 && ` (${euros(p.custoMesesGratis)})`}
                    </td>
                    <td className="p-2">{euros(p.receitaPaga)}</td>
                    <td className="p-2">{euros(p.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="secao-titulo">Registo completo</h2>
            <Link
              href="/admin/recomendacoes/estudo/csv"
              prefetch={false}
              className="rounded-[13px] border border-[var(--color-linha)] px-3 py-2 text-[14px] font-medium text-[var(--color-azul-fundo)]"
            >
              Descarregar CSV
            </Link>
          </div>

          {linhas.length === 0 ? (
            <EmptyState titulo="Ainda não há dados" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-linha)] text-xs text-foreground/60">
                    <th className="p-2">Recomendador</th>
                    <th className="p-2">Novo aluno</th>
                    <th className="p-2">Professor</th>
                    <th className="p-2">Modalidade</th>
                    <th className="p-2">Inscrição</th>
                    <th className="p-2">Taxas</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2">Benefício</th>
                    <th className="p-2">Meses pagos</th>
                    <th className="p-2">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--color-linha)]">
                      <td className="p-2">{l.recomendadorNome}</td>
                      <td className="p-2">
                        {l.novoAlunoNome}
                        {l.novoAlunoDesistiu && (
                          <span className="text-xs text-foreground/50"> (desistiu)</span>
                        )}
                      </td>
                      <td className="p-2">{l.professorNome}</td>
                      <td className="p-2">{l.modalidade ?? '—'}</td>
                      <td className="p-2">{l.dataInscricao ?? '—'}</td>
                      <td className="p-2">
                        {l.valorInscricao === null && l.valorSeguro === null
                          ? '—'
                          : euros((l.valorInscricao ?? 0) + (l.valorSeguro ?? 0))}
                      </td>
                      <td className="p-2">{l.estado}</td>
                      <td className="p-2">
                        {l.beneficioEstado ?? '—'}
                        {l.beneficioMes && ` (${l.beneficioMes})`}
                      </td>
                      <td className="p-2">{l.mesesPagosNovoAluno}</td>
                      <td className="p-2">{euros(l.receitaNovoAluno)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
