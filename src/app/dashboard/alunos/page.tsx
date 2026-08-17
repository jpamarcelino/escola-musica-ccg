import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { criarAluno } from '@/lib/actions/aluno'
import { SubmitButton } from '@/components/submit-button'
import { CampoTexto } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'
import { EmptyState } from '@/components/empty-state'
import { calcularIdade } from '@/lib/idade'
import { hojeISO } from '@/lib/datas'
import { ehContaCCG } from '@/lib/navegacao'

// Gestão dos perfis de aluno da Conta CCG.
//
// Existe porque criar uma conta deixou de criar um aluno automaticamente
// (migração 0025): quem gere e quem tem aulas passaram a ser coisas
// diferentes, e é aqui que se diz quem são os alunos. A Home continua a
// ser a visão familiar; esta página é a lista onde se acrescenta e de onde
// se entra em cada perfil.
//
// Não há eliminação de alunos: um perfil pode ter matrículas, presenças e
// mensalidades atrás dele, e apagá-lo é uma decisão com consequências que
// esta fase não trata.
export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }

  // Página da Conta CCG. Professores e admins têm as suas próprias áreas —
  // e o filtro por encarregado_id abaixo devolveria uma lista vazia que não
  // explicava nada.
  if (!ehContaCCG(profile?.tipo)) {
    redirect('/dashboard')
  }

  const { data: alunosData } = await supabase
    .from('alunos')
    .select('id, nome, data_nascimento, propria_conta_id')
    .eq('encarregado_id', user.id)
    .order('criado_em')

  const alunos = alunosData ?? []
  const jaTemProprio = alunos.some((a) => a.propria_conta_id === user.id)

  return (
    <main id="conteudo-principal" className="partitura-pagina familia-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Conta CCG</p>
            <h1>Alunos</h1>
            <p>
              {alunos.length === 0
                ? 'Ainda não há ninguém inscrito nesta conta.'
                : alunos.length === 1
                  ? '1 aluno nesta conta.'
                  : `${alunos.length} alunos nesta conta.`}
            </p>
          </div>
        </header>

        {erro && <MensagemErro>{erro}</MensagemErro>}

        <section className="familia-alunos" aria-labelledby="lista-alunos-titulo">
          <div className="partitura-seccao-cabecalho">
            <div>
              <p className="partitura-indice">01</p>
              <h2 id="lista-alunos-titulo">Quem tem aulas</h2>
            </div>
          </div>

          {alunos.length === 0 ? (
            <EmptyState
              titulo="Ainda não tens alunos associados."
              descricao="Adiciona a pessoa que vai frequentar as aulas — podes ser tu ou um filho."
            />
          ) : (
            <div>
              {alunos.map((aluno) => {
                const idade = calcularIdade(aluno.data_nascimento)
                return (
                  <Link key={aluno.id} href={`/aluno/${aluno.id}`}>
                    <strong>{aluno.nome}</strong>
                    <span>
                      {aluno.propria_conta_id === user.id ? 'O titular da conta' : 'Dependente'}
                      {idade !== null ? ` · ${idade} anos` : ''}
                    </span>
                    <i aria-hidden="true">→</i>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <details className="familia-adicionar" open={alunos.length === 0}>
          <summary>Adicionar aluno</summary>
          <form action={criarAluno} className="mt-[16px] space-y-[14px]">
            <CampoTexto id="nome" name="nome" label="Nome do aluno" />
            <CampoTexto
              id="dataNascimento"
              name="dataNascimento"
              label="Data de nascimento"
              type="date"
              max={hojeISO()}
            />

            <fieldset className="alunos-quem">
              <legend>Quem é este aluno?</legend>
              <label>
                <input type="radio" name="ehProprio" value="nao" defaultChecked />
                <span>
                  <strong>Um dependente</strong>
                  <small>Um filho ou educando, sem conta própria.</small>
                </span>
              </label>
              {/* A opção só aparece enquanto não houver um perfil do
                  titular: dois "sou eu" seriam a mesma pessoa duas vezes,
                  com as matrículas repartidas entre os dois. */}
              {!jaTemProprio && (
                <label>
                  <input type="radio" name="ehProprio" value="sim" />
                  <span>
                    <strong>Sou eu</strong>
                    <small>Sou eu que vou às aulas, com esta mesma conta.</small>
                  </span>
                </label>
              )}
            </fieldset>

            <SubmitButton textoAGuardar="A adicionar…" className="familia-adicionar-botao">
              Adicionar aluno
            </SubmitButton>
          </form>
        </details>
      </div>
    </main>
  )
}
