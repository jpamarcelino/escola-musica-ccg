import { Fragment } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { atualizarHistoricoMensalidades } from '@/lib/actions/pagamentos'
import { MESES_ANO_LETIVO } from '@/lib/ano-letivo'

type MatriculaAtual = {
  aluno_id: string
  aluno: { nome: string } | null
}

type MensalidadeHistorico = {
  aluno_id: string
  aluno_nome: string | null
  ano: number
  mes: number
  valor: number | null
  numero_fatura: string | null
  desistencia: boolean
}

export default async function HistoricoPagamentosProfessorPage({
  params,
}: {
  params: Promise<{ professorId: string }>
}) {
  const { professorId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: professorData } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  if (!professorData) {
    notFound()
  }

  // Os alunos desta tabela são a união de quem está matriculado agora com
  // quem já teve alguma mensalidade com este professor — um aluno que se
  // desmatriculou continua a aparecer, com o histórico intacto.
  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('aluno_id, aluno:profiles!matriculas_aluno_id_fkey(nome)')
    .eq('professor_id', professorId)
    .eq('estado', 'confirmado')
  const matriculasAtuais = (matriculasData ?? []) as unknown as MatriculaAtual[]

  const { data: mensalidadesData } = await supabase
    .from('mensalidades')
    .select('aluno_id, aluno_nome, ano, mes, valor, numero_fatura, desistencia')
    .eq('professor_id', professorId)
  const mensalidades = (mensalidadesData ?? []) as unknown as MensalidadeHistorico[]

  // Um aluno que já se desmatriculou ou apagou a conta continua a
  // aparecer, com o histórico intacto — o nome vem do snapshot guardado
  // em cada mensalidade (aluno_nome), já que a matrícula (ou a própria
  // conta) pode já não existir.
  const nomePorAluno = new Map<string, string>()
  for (const m of matriculasAtuais) {
    if (m.aluno) nomePorAluno.set(m.aluno_id, m.aluno.nome)
  }
  for (const m of mensalidades) {
    if (m.aluno_nome && !nomePorAluno.has(m.aluno_id)) nomePorAluno.set(m.aluno_id, m.aluno_nome)
  }
  const alunos = [...nomePorAluno.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const valorPorCelula = new Map<
    string,
    { valor: number | null; numero_fatura: string | null; desistencia: boolean }
  >()
  for (const m of mensalidades) {
    valorPorCelula.set(`${m.aluno_id}_${m.ano}_${m.mes}`, {
      valor: m.valor,
      numero_fatura: m.numero_fatura,
      desistencia: m.desistencia,
    })
  }

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin/pagamentos/historico" />
          <h1 className="text-2xl font-semibold text-foreground">{professorData.nome}</h1>
        </div>

        {alunos.length === 0 ? (
          <p className="text-sm text-foreground/60">Ainda não há histórico de mensalidades.</p>
        ) : (
          <form action={atualizarHistoricoMensalidades} className="space-y-3">
            <input type="hidden" name="professorId" value={professorId} />
            {alunos.map((a) => (
              <input key={a.id} type="hidden" name="alunoIds" value={a.id} />
            ))}

            <button type="submit" className="rounded border border-foreground/20 px-3 py-1 text-sm">
              Guardar alterações
            </button>

            <div className="tabela-historico-wrap">
              <table className="tabela-historico">
                <thead>
                  <tr>
                    <th rowSpan={2} className="th-aluno">
                      Aluno
                    </th>
                    {MESES_ANO_LETIVO.map(({ ano, mes, label }) => (
                      <th key={`${ano}-${mes}`} colSpan={2}>
                        {label} {ano}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {MESES_ANO_LETIVO.map(({ ano, mes }) => (
                      <Fragment key={`${ano}-${mes}`}>
                        <th>Valor</th>
                        <th className="th-fatura">Nº fatura</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alunos.map((aluno) => (
                    <tr key={aluno.id}>
                      <td className="td-aluno">{aluno.nome}</td>
                      {MESES_ANO_LETIVO.map(({ ano, mes }) => {
                        const celula = valorPorCelula.get(`${aluno.id}_${ano}_${mes}`)
                        if (celula?.desistencia) {
                          return (
                            <Fragment key={`${ano}-${mes}`}>
                              <td>
                                <input
                                  type="text"
                                  readOnly
                                  name={`v_${aluno.id}_${ano}_${mes}`}
                                  value="DT"
                                  title="Desistência — aluno saiu antes deste mês."
                                  className="celula-desistencia"
                                />
                              </td>
                              <td className="th-fatura">
                                <input type="text" readOnly name={`f_${aluno.id}_${ano}_${mes}`} value="" />
                              </td>
                            </Fragment>
                          )
                        }
                        return (
                          <Fragment key={`${ano}-${mes}`}>
                            <td>
                              <input
                                type="text"
                                inputMode="decimal"
                                name={`v_${aluno.id}_${ano}_${mes}`}
                                defaultValue={celula?.valor != null ? celula.valor.toFixed(2) : ''}
                                placeholder="--"
                              />
                            </td>
                            <td className="th-fatura">
                              <input
                                type="text"
                                maxLength={10}
                                name={`f_${aluno.id}_${ano}_${mes}`}
                                defaultValue={celula?.numero_fatura ?? ''}
                                placeholder="--"
                              />
                            </td>
                          </Fragment>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="submit" className="rounded border border-foreground/20 px-3 py-1 text-sm">
              Guardar alterações
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
