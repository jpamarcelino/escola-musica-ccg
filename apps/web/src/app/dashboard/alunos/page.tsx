import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { criarAluno } from '@/lib/actions/aluno'
import { ChevronRight, UserPlus, UserRound } from 'lucide-react'
import { SubmitButton } from '@/components/submit-button'
import { calcularIdade, hojeISO, TEXTOS_LEGAIS } from '@ccg/core'
import { ehContaCCG } from '@/lib/navegacao'
import { VoltarAtras } from '@/components/voltar-atras'

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
    <main id="conteudo-principal" className="pinterest-alunos-pagina">
      <div className="pinterest-alunos-folha">
        <header className="pinterest-alunos-cabecalho">
          <VoltarAtras destino="/dashboard" className="pinterest-alunos-voltar" rotulo="Voltar ao início" />
          <div>
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

        {erro && <p className="pinterest-alunos-erro">{erro}</p>}

        <section className="pinterest-alunos-seccao" aria-labelledby="lista-alunos-titulo">
          <h2 id="lista-alunos-titulo">Quem tem aulas</h2>

          {alunos.length === 0 ? (
            <div className="pinterest-alunos-vazio">
              <strong>Ainda não tens alunos associados.</strong>
              <p>Adiciona a pessoa que vai frequentar as aulas — podes ser tu ou um filho.</p>
            </div>
          ) : (
            /* O mesmo cartão de lista da Home: são os mesmos alunos, e
               vê-los de duas maneiras diferentes em dois ecrãs a dois
               toques um do outro não ajudava ninguém. */
            <div className="pinterest-alunos">
              {alunos.map((aluno) => {
                const idade = calcularIdade(aluno.data_nascimento)
                const proprio = aluno.propria_conta_id === user.id
                return (
                  <Link key={aluno.id} href={`/aluno/${aluno.id}?voltar=alunos`}>
                    <span className="pinterest-aluno-avatar" aria-hidden="true">
                      {aluno.nome.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{aluno.nome}</strong>
                      <small>
                        {proprio ? 'O titular da conta' : 'Dependente'}
                        {idade !== null ? ` · ${idade} anos` : ''}
                      </small>
                    </span>
                    <span />
                    <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Duas portas separadas em vez de um formulário só com um botão
            de rádio no fim. Adicionar-se a si próprio e inscrever um filho
            são coisas diferentes: numa a app já sabe o nome, na outra tem
            de o perguntar. Com um formulário só, o titular escrevia o
            próprio nome outra vez — e nada impedia que o escrevesse
            diferente do da conta. */}
        <section className="pinterest-alunos-seccao" aria-labelledby="adicionar-aluno-titulo">
          <h2 id="adicionar-aluno-titulo">Adicionar aluno</h2>

          <div className="pinterest-adicionar">
            {/* Só enquanto não houver um perfil do titular: dois "sou eu"
                seriam a mesma pessoa duas vezes, com as matrículas
                repartidas entre os dois. */}
            {!jaTemProprio && (
              <details open={alunos.length === 0}>
                <summary>
                  <span aria-hidden="true">
                    <UserRound size={20} strokeWidth={2} />
                  </span>
                  <span>Criar perfil de aluno para mim</span>
                  <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
                </summary>
                <form action={criarAluno}>
                  <input type="hidden" name="ehProprio" value="sim" />
                  <p className="pinterest-adicionar-identidade">
                    <span>Nome</span>
                    <strong>{profile?.nome}</strong>
                  </p>
                  {/* A data continua a ser perguntada: o registo não a
                      recolhe (pede só a declaração de maioridade), por
                      isso a app não a sabe. É pedida uma vez e fica. */}
                  <label className="pinterest-adicionar-campo" htmlFor="dataNascimentoProprio">
                    <span>Data de nascimento</span>
                    <input
                      id="dataNascimentoProprio"
                      name="dataNascimento"
                      type="date"
                      max={hojeISO()}
                      required
                    />
                  </label>
                  <SubmitButton textoAGuardar="A adicionar…">
                    Adicionar-me como aluno
                  </SubmitButton>
                </form>
              </details>
            )}

            <details open={jaTemProprio && alunos.length === 0}>
              <summary>
                <span aria-hidden="true">
                  <UserPlus size={20} strokeWidth={2} />
                </span>
                <span>Adicionar um filho ou educando</span>
                <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
              </summary>
              <form action={criarAluno}>
                <input type="hidden" name="ehProprio" value="nao" />
                <label className="pinterest-adicionar-campo" htmlFor="nome">
                  <span>Nome do aluno</span>
                  <input id="nome" name="nome" required />
                </label>
                <label className="pinterest-adicionar-campo" htmlFor="dataNascimento">
                  <span>Data de nascimento</span>
                  <input
                    id="dataNascimento"
                    name="dataNascimento"
                    type="date"
                    max={hojeISO()}
                    required
                  />
                </label>
                {/* Só neste ramo. Criar um perfil para outra pessoa é o
                    único caso em que há legitimidade a declarar — quem se
                    adiciona a si próprio, acima, não declara nada sobre
                    si. O pop-up de /pedir-aula pede exatamente o mesmo:
                    são duas portas para a mesma linha da tabela, e não
                    podem exigir coisas diferentes. */}
                <label className="pinterest-adicionar-declaracao">
                  <input type="checkbox" name="declaraLegitimidade" required />
                  <span>{TEXTOS_LEGAIS.declaracaoPerfilAluno}</span>
                </label>
                <SubmitButton textoAGuardar="A adicionar…">Adicionar aluno</SubmitButton>
              </form>
            </details>
          </div>
        </section>
      </div>
    </main>
  )
}
