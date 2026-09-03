import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubmitButton } from '@/components/submit-button'
import { recusarIndicacao, registarRecomendacao } from '@/lib/actions/recomendacoes'
import type { MatriculaEstado } from '@ccg/types'
import { VoltarAtras } from '@/components/voltar-atras'
import { ehSecretaria, papelDoAdmin } from '@/lib/permissoes'

type ProfessorAderente = {
  id: string
  profiles: { nome: string } | null
}

type AlunoDoProfessor = {
  aluno_id: string
  estado: MatriculaEstado
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
}

// O professor escolhe-se primeiro e fica no URL, tal como nos outros
// assistentes da app (pedido de aula). Assim as listas de alunos podem
// ser filtradas no servidor — só aparecem alunos daquele professor, que
// é precisamente a regra do Art. 8.º — sem precisar de estado no cliente.
export default async function NovaRecomendacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ professor?: string; erro?: string; indicacao?: string }>
}) {
  const { professor: professorId, erro, indicacao } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const papel = await papelDoAdmin(supabase, user.id)

  if (!papel.admin) {
    redirect('/dashboard')
  }

  // Registar é da secretaria. Um diretor que chegue aqui pelo endereço
  // volta à lista, onde tem tudo o que lhe interessa ver.
  if (!ehSecretaria(papel)) {
    redirect('/admin/recomendacoes')
  }

  // Quando se chega aqui a partir de uma indicação escrita por quem pediu
  // a aula (0026), traz-se o que a pessoa escreveu. Não preenche os campos
  // do formulário: é uma pista para a secretaria confirmar de quem se
  // trata, e a escolha final continua a ser feita das listas reais.
  const { data: indicacaoData } = indicacao
    ? await supabase
        .from('indicacoes_recomendacao')
        .select(
          'id, novo_aluno_id, novo_aluno_nome, professor_id, recomendador_nome_indicado, modalidade_indicada, estado'
        )
        .eq('id', Number(indicacao))
        .maybeSingle()
    : { data: null }
  const indicacaoAtual = indicacaoData as {
    id: number
    novo_aluno_id: string
    novo_aluno_nome: string
    professor_id: string
    recomendador_nome_indicado: string
    modalidade_indicada: string | null
    estado: string
  } | null

  // O professor da indicação é o do pedido — não faz sentido escolher
  // outro, e pré-seleccioná-lo poupa um passo.
  const professorEscolhido = professorId ?? indicacaoAtual?.professor_id

  const { data: professoresData } = await supabase
    .from('perfis_escola')
    .select('id, profiles(nome)')
    .eq('tipo', 'professor')
    .eq('adere_recomendacao', true)
  const professores = (professoresData ?? []) as unknown as ProfessorAderente[]
  professores.sort((a, b) => (a.profiles?.nome ?? '').localeCompare(b.profiles?.nome ?? ''))

  const { data: alunosData } = professorEscolhido
    ? await supabase
        .from('matriculas')
        .select('aluno_id, estado, alunos(nome), instrumentos(nome)')
        .eq('professor_id', professorEscolhido)
    : { data: [] }
  const matriculas = (alunosData ?? []) as unknown as AlunoDoProfessor[]

  // Um aluno com duas disciplinas com o mesmo professor apareceria duas
  // vezes na lista — fica só uma entrada por aluno.
  const alunosConfirmados = new Map<string, string>()
  const todosOsAlunos = new Map<string, string>()
  for (const m of matriculas) {
    const nome = m.alunos?.nome
    if (!nome) continue
    todosOsAlunos.set(m.aluno_id, nome)
    if (m.estado === 'confirmado') {
      alunosConfirmados.set(m.aluno_id, nome)
    }
  }

  const ordenarPorNome = (lista: Map<string, string>) =>
    [...lista.entries()].sort((a, b) => a[1].localeCompare(b[1]))

  return (
    <main id="conteudo-principal" className="partitura-pagina recomendacao-nova-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><VoltarAtras destino="/admin/recomendacoes" className="partitura-voltar" rotulo="Voltar às recomendações">←</VoltarAtras><div><p className="partitura-sobretitulo">Novo registo</p><h1>Registar recomendação</h1><p>Professor, alunos e confirmação administrativa.</p></div></header>

        {erro && (
          <p className="admin-alerta" role="alert">
            {decodeURIComponent(erro)}
          </p>
        )}

        {indicacaoAtual && (
          <section className="indicacao-origem">
            <p className="partitura-indice">Indicação por confirmar</p>
            <p>
              <strong>{indicacaoAtual.novo_aluno_nome}</strong> escreveu, ao pedir a aula,
              que foi recomendado por <strong>{indicacaoAtual.recomendador_nome_indicado}</strong>
              {indicacaoAtual.modalidade_indicada
                ? `, que terá aulas de ${indicacaoAtual.modalidade_indicada}`
                : ''}
              .
            </p>
            <small>
              O nome está como a pessoa o escreveu, e pode não corresponder a ninguém.
              Confirma de quem se trata e escolhe-o em baixo — ao registar, esta
              indicação fica fechada.
            </small>
            {indicacaoAtual.estado === 'por_confirmar' && (
              /* A saída para quando não se encontra ninguém. Sem ela, a
                 indicação ficava para sempre na lista de trabalho. */
              <form action={recusarIndicacao} className="indicacao-recusar">
                <input type="hidden" name="indicacaoId" value={indicacaoAtual.id} />
                <input
                  type="text"
                  name="motivo"
                  maxLength={300}
                  placeholder="Porquê? (ex: não há nenhuma Maria com este professor)"
                  aria-label="Motivo da recusa"
                />
                <SubmitButton textoAGuardar="A arquivar…">Não encontrei — arquivar</SubmitButton>
              </form>
            )}
          </section>
        )}

        <section className="recomendacao-passo recomendacao-passo-professor">
          <h2 className="secao-titulo">1. Professor</h2>
          {professores.length === 0 ? (
            <p className="rounded-[13px] border border-[var(--color-linha)] p-3 text-[13px] text-[var(--color-tinta-suave)]">
              Nenhum professor aderiu ao Programa. A adesão marca-se na ficha de cada
              professor, em <strong>Professores</strong>. Sem adesão não pode haver
              recomendações — é o professor que suporta metade do benefício (Art. 5.º).
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {professores.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/recomendacoes/nova?professor=${p.id}${indicacao ? `&indicacao=${indicacao}` : ''}`}
                  className={
                    professorEscolhido === p.id
                      ? 'rounded-[13px] border-[1.5px] border-[var(--color-azul-fundo)] bg-[var(--color-azul-fundo)] px-3 py-2 text-[14px] font-medium text-white'
                      : 'rounded-[13px] border border-[var(--color-linha)] px-3 py-2 text-[14px] font-medium text-[var(--color-azul-fundo)]'
                  }
                >
                  {p.profiles?.nome}
                </Link>
              ))}
            </div>
          )}
        </section>

        {professorEscolhido && (
          <form action={registarRecomendacao} className="recomendacao-form">
            <input type="hidden" name="professorId" value={professorEscolhido} />
            {indicacaoAtual && indicacaoAtual.estado === 'por_confirmar' && (
              <input type="hidden" name="indicacaoId" value={indicacaoAtual.id} />
            )}

            <section className="recomendacao-passo">
              <h2 className="secao-titulo">2. Quem recomendou</h2>
              {alunosConfirmados.size === 0 ? (
                <p className="text-[13px] text-[var(--color-tinta-suave)]">
                  Este professor não tem alunos com matrícula confirmada.
                </p>
              ) : (
                <><label htmlFor="recomendadorId" className="recomendacao-label">Aluno que recomendou</label><select
                  id="recomendadorId"
                  name="recomendadorId"
                  required
                  defaultValue=""
                  className="w-full rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
                >
                  <option value="" disabled>
                    Escolhe o aluno…
                  </option>
                  {ordenarPorNome(alunosConfirmados).map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome}
                    </option>
                  ))}
                </select></>
              )}
            </section>

            <section className="recomendacao-passo">
              <h2 className="secao-titulo">3. Novo aluno</h2>
              <label htmlFor="novoAlunoId" className="recomendacao-label">Aluno recomendado</label><select
                id="novoAlunoId"
                name="novoAlunoId"
                defaultValue=""
                className="w-full rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
              >
                <option value="">Ainda não está na app — escrevo o nome</option>
                {ordenarPorNome(todosOsAlunos).map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
              <label htmlFor="novoAlunoNomeLivre" className="recomendacao-label">Nome, caso ainda não exista na aplicação</label><input
                id="novoAlunoNomeLivre"
                type="text"
                name="novoAlunoNomeLivre"
                placeholder="Nome do novo aluno (só se não estiver na lista)"
                className="w-full rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
              />
            </section>

            <section className="recomendacao-passo">
              <h2 className="secao-titulo">4. Notas</h2>
              {/* O que aqui estava — datas de inscrição e de primeiro
                  pagamento, valor da inscrição, e um visto para "validar já"
                  — saiu todo. Nenhum desses dados precisa de ser escrito:
                  quando a secretaria marcar como paga a primeira mensalidade
                  deste aluno, a recomendação valida-se, as taxas são copiadas
                  da tabela da escola e o mês grátis do recomendador nasce
                  (migrações 0027 e 0028). Pedir aqui a mesma confirmação era
                  fazer a mesma pessoa dizer o mesmo facto duas vezes. */}
              <p className="text-[13px] text-[var(--color-tinta-suave)]">
                Não há nada a confirmar aqui. A recomendação valida-se sozinha quando
                marcares como paga a primeira mensalidade deste aluno, em{' '}
                <strong>Mensalidades</strong> — e é aí que o mês grátis do recomendador
                passa a existir.
              </p>
              <div className="space-y-1">
                <label
                  htmlFor="modalidade"
                  className="block text-[12.5px] font-medium text-[var(--color-tinta-suave)]"
                >
                  Modalidade do novo aluno (deixa vazio para usar a da matrícula)
                </label>
                <input
                  id="modalidade"
                  name="modalidade"
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
                  className="w-full rounded-[13px] border border-[var(--color-linha)] bg-white px-3 py-2 text-[14px] text-[var(--color-tinta)]"
                />
              </div>
            </section>

            <SubmitButton
              textoAGuardar="A registar…"
              className="recomendacao-submeter"
            >
              Registar
            </SubmitButton>
          </form>
        )}
      </div>
    </main>
  )
}
