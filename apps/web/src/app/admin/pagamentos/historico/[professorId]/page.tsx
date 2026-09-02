import { Fragment } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/empty-state'
import { atualizarHistoricoMensalidades } from '@/lib/actions/pagamentos'
import { MESES_ANO_LETIVO, rotuloMes } from '@ccg/core'
import { VoltarAtras } from '@/components/voltar-atras'

type MatriculaAtual = {
  aluno_id: string
  instrumento_id: number | null
  aluno: { nome: string } | null
  instrumentos: { nome: string } | null
}

type MensalidadeHistorico = {
  aluno_id: string
  aluno_nome: string | null
  instrumento_id: number | null
  instrumento_nome: string | null
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

  // Os alunos desta tabela são a união de quem está matriculado agora com
  // quem já teve alguma mensalidade com este professor — um aluno que se
  // desmatriculou continua a aparecer, com o histórico intacto.
  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('aluno_id, instrumento_id, aluno:alunos(nome), instrumentos(nome)')
    .eq('professor_id', professorId)
    .eq('estado', 'confirmado')
  const matriculasAtuais = (matriculasData ?? []) as unknown as MatriculaAtual[]

  const { data: mensalidadesData } = await supabase
    .from('mensalidades')
    .select('aluno_id, aluno_nome, instrumento_id, instrumento_nome, ano, mes, valor, numero_fatura, desistencia')
    .eq('professor_id', professorId)
  const mensalidades = (mensalidadesData ?? []) as unknown as MensalidadeHistorico[]

  // Um aluno que já se desmatriculou ou apagou a conta continua a
  // aparecer, com o histórico intacto — o nome vem do snapshot guardado
  // em cada mensalidade (aluno_nome), já que a matrícula (ou a própria
  // conta) pode já não existir.
  // Uma linha por aluno E disciplina, e não por aluno. Desde a 0045 a
  // disciplina faz parte da identidade de uma mensalidade: quem anda em
  // Piano e Bateria com o mesmo professor tem duas mensalidades por mês,
  // e uma linha só não tinha onde as pôr — escrevia uma por cima da
  // outra.
  const linhaPorChave = new Map<
    string,
    { chave: string; alunoId: string; instrumentoId: number; nome: string; disciplina: string }
  >()

  function juntar(
    alunoId: string,
    instrumentoId: number | null,
    nome: string | null,
    disciplina: string | null
  ) {
    const id = instrumentoId ?? 0
    const chave = `${alunoId}:${id}`
    if (linhaPorChave.has(chave) || !nome) return
    linhaPorChave.set(chave, {
      chave,
      alunoId,
      instrumentoId: id,
      nome,
      disciplina: disciplina ?? '',
    })
  }

  for (const m of matriculasAtuais) {
    juntar(m.aluno_id, m.instrumento_id, m.aluno?.nome ?? null, m.instrumentos?.nome ?? null)
  }
  // Quem já se desmatriculou (ou apagou a conta) continua a aparecer: o
  // nome e a disciplina vêm do que ficou gravado na própria mensalidade.
  for (const m of mensalidades) {
    juntar(m.aluno_id, m.instrumento_id, m.aluno_nome, m.instrumento_nome)
  }

  const linhas = [...linhaPorChave.values()].sort(
    (a, b) => a.nome.localeCompare(b.nome) || a.disciplina.localeCompare(b.disciplina)
  )
  const alunos = new Set(linhas.map((l) => l.alunoId))

  const valorPorCelula = new Map<
    string,
    { valor: number | null; numero_fatura: string | null; desistencia: boolean }
  >()
  for (const m of mensalidades) {
    valorPorCelula.set(`${m.aluno_id}:${m.instrumento_id ?? 0}_${m.ano}_${m.mes}`, {
      valor: m.valor,
      numero_fatura: m.numero_fatura,
      desistencia: m.desistencia,
    })
  }

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-historico-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><VoltarAtras destino="/admin/pagamentos/historico" className="partitura-voltar" rotulo="Voltar ao histórico">←</VoltarAtras><div><p className="partitura-sobretitulo">Arquivo financeiro</p><h1>{professorData.nome}</h1><p>Ano letivo completo · {alunos.size} {alunos.size === 1 ? 'aluno' : 'alunos'}{linhas.length !== alunos.size && ` · ${linhas.length} disciplinas`}</p></div></header>

        {linhas.length === 0 ? (
          <EmptyState titulo="Ainda não há histórico de mensalidades" />
        ) : (
          <form action={atualizarHistoricoMensalidades} className="admin-historico-form">
            <input type="hidden" name="professorId" value={professorId} />
            {linhas.map((l) => (
              <input key={l.chave} type="hidden" name="linhas" value={l.chave} />
            ))}

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
                  {linhas.map((aluno) => (
                    <tr key={aluno.chave}>
                      <td className="td-aluno">
                        {aluno.nome}
                        {aluno.disciplina && (
                          <span className="td-aluno-disciplina">{aluno.disciplina}</span>
                        )}
                      </td>
                      {MESES_ANO_LETIVO.map(({ ano, mes }) => {
                        const celula = valorPorCelula.get(`${aluno.chave}_${ano}_${mes}`)
                        if (celula?.desistencia) {
                          return (
                            <Fragment key={`${ano}-${mes}`}>
                              <td>
                                <input
                                  type="text"
                                  readOnly
                                  name={`v_${aluno.chave}_${ano}_${mes}`}
                                  value="DT"
                                  aria-label={`${aluno.nome}, ${rotuloMes(ano, mes)}: desistência`}
                                  title="Desistência — aluno saiu antes deste mês."
                                  className="celula-desistencia"
                                />
                              </td>
                              <td className="th-fatura">
                                <input
                                  type="text"
                                  readOnly
                                  name={`f_${aluno.chave}_${ano}_${mes}`}
                                  value=""
                                  aria-label={`${aluno.nome}, ${rotuloMes(ano, mes)}: sem fatura`}
                                />
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
                                name={`v_${aluno.chave}_${ano}_${mes}`}
                                defaultValue={celula?.valor != null ? celula.valor.toFixed(2) : ''}
                                placeholder="--"
                                aria-label={`${aluno.nome}, ${rotuloMes(ano, mes)}: valor em euros`}
                              />
                            </td>
                            <td className="th-fatura">
                              <input
                                type="text"
                                maxLength={10}
                                name={`f_${aluno.chave}_${ano}_${mes}`}
                                defaultValue={celula?.numero_fatura ?? ''}
                                placeholder="--"
                                aria-label={`${aluno.nome}, ${rotuloMes(ano, mes)}: número de fatura`}
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

            {/* Um botão, no fim do formulário. Havia dois iguais, um em
                cada ponta da tabela; dois botões idênticos no mesmo
                formulário são uma pergunta ("fazem o mesmo?") sem
                ganho nenhum. */}
            <button type="submit" className="admin-guardar">
              Guardar alterações
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
