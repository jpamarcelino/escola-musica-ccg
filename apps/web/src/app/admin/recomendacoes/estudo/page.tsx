import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { recolherDadosEstudo } from '@/lib/estudo-recomendacoes'
import { euros } from '@/lib/moeda'

function contarRecomendacoes(n: number) {
  return n === 1 ? '1 recomendação' : `${n} recomendações`
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

  const { linhas, totais } = await recolherDadosEstudo(supabase)

  // §19 da proposta: o resultado líquido é a receita nova gerada (as
  // inscrições mais as mensalidades pagas pelos novos alunos) menos o
  // custo das mensalidades oferecidas.
  const receitaNova = totais.valorInscricoes + totais.receitaNovosAlunos
  const resultadoLiquido = receitaNova - totais.valorBeneficios

  const aderentes = linhas.filter((l) => l.professorAderente)
  const naoAderentes = linhas.filter((l) => !l.professorAderente)

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
            §28 da proposta. Só aparecem aqui recomendações já registadas — a comparação
            completa entre as duas classes de professores exige também os dados de
            inscrições fora do Programa.
          </p>
          <div className="space-y-2">
            <div className="lista-item flex items-center justify-between gap-3">
              <p className="lista-item-titulo">Professores aderentes</p>
              <p className="lista-item-sub">{contarRecomendacoes(aderentes.length)}</p>
            </div>
            <div className="lista-item flex items-center justify-between gap-3">
              <p className="lista-item-titulo">Professores que já não aderem</p>
              <p className="lista-item-sub">{contarRecomendacoes(naoAderentes.length)}</p>
            </div>
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
