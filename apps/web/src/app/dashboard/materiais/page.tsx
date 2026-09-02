import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { ehContaCCG } from '@/lib/navegacao'

// A porta de entrada dos materiais, a partir da barra de baixo.
//
// O caderno é de quem tem a aula, não da conta: com dois filhos, há dois
// cadernos, e a barra não pode escolher um por eles — foi o erro que já
// se tinha cometido antes, quando a nav ia buscar o primeiro aluno com um
// `.limit(1)` e quem tivesse dois carregava sempre no mesmo sem perceber
// porquê (ver o comentário no topo de lib/navegacao.ts).
//
// Por isso esta página só existe para desfazer essa ambiguidade, e só
// quando ela existe: com um aluno só, salta logo para o caderno dele.
export default async function MateriaisDaContaPage() {
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }

  // Professores e admins têm as suas próprias áreas, e a consulta abaixo
  // devolver-lhes-ia uma lista vazia que não explicava nada.
  if (!ehContaCCG(profile?.tipo)) {
    redirect('/dashboard')
  }

  const { data: alunosData } = await supabase
    .from('alunos')
    .select('id, nome, propria_conta_id')
    .eq('encarregado_id', user.id)
    .order('criado_em')

  const alunos = alunosData ?? []

  // Sem aulas, não há caderno. Os materiais são o que se leva de uma aula
  // — vídeos do professor, partituras, o metrónomo para estudar em casa.
  // Um perfil criado mas ainda sem matrícula continua a aparecer na
  // lista, para se perceber que existe e que lhe falta a inscrição, mas
  // não abre nada.
  const { data: comAulasData } = await supabase
    .from('matriculas')
    .select('aluno_id')
    .in('aluno_id', alunos.map((a) => a.id))
    // "A decorrer" e não "qualquer estado": quem cancelou perde o acesso
    // no mesmo instante, e um pedido por responder ainda não é uma aula.
    .eq('estado', 'confirmado')

  const comAulas = new Set(((comAulasData ?? []) as { aluno_id: string }[]).map((m) => m.aluno_id))
  const alunosComAulas = alunos.filter((a) => comAulas.has(a.id))

  // Um caderno só a que se possa ir: escolher entre uma coisa não é
  // escolher. Vai direto — mesmo que haja outros perfis na conta, porque
  // esses não têm para onde levar.
  if (alunosComAulas.length === 1 && alunos.length === 1) {
    redirect(`/aluno/${alunosComAulas[0].id}/materiais`)
  }

  return (
    <main id="conteudo-principal" className="pinterest-materiais">
      <div className="pinterest-materiais-folha">
        <header className="pinterest-materiais-cabecalho">
          <Link href="/dashboard" className="pinterest-materiais-voltar" aria-label="Voltar ao início">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
          <div>
            <h1>Materiais</h1>
            <p>
              {alunos.length === 0
                ? 'Ainda não há ninguém inscrito nesta conta.'
                : alunosComAulas.length === 0
                  ? 'Ninguém nesta conta tem aulas a decorrer.'
                  : 'De quem é o caderno?'}
            </p>
          </div>
        </header>

        <section aria-label="Escolher aluno">
          {alunos.length === 0 ? (
            <div className="pinterest-materiais-vazio">
              <strong>Ainda não há cadernos</strong>
              <p>
                Os materiais são de quem tem aulas. Adiciona primeiro a pessoa que vai
                frequentá-las.
              </p>
              <Link href="/dashboard/alunos">Adicionar aluno</Link>
            </div>
          ) : (
            <div className="pinterest-alunos">
              {alunos.map((aluno) => {
                const papel =
                  aluno.propria_conta_id === user.id ? 'O titular da conta' : 'Dependente'
                const inicial = aluno.nome.slice(0, 1).toUpperCase()

                // Sem aulas: fica visível, mas não é destino. Deixa de o
                // ser para o rato, para o teclado e para um leitor de
                // ecrã — é o mesmo critério das disciplinas fora da idade
                // no pedido de aula.
                if (!comAulas.has(aluno.id)) {
                  return (
                    <div key={aluno.id} aria-disabled="true">
                      <span className="pinterest-aluno-avatar" aria-hidden="true">
                        {inicial}
                      </span>
                      <span>
                        <strong>{aluno.nome}</strong>
                        <small>{papel} · sem aulas a decorrer</small>
                      </span>
                      <span />
                    </div>
                  )
                }

                return (
                  <Link key={aluno.id} href={`/aluno/${aluno.id}/materiais`}>
                    <span className="pinterest-aluno-avatar" aria-hidden="true">
                      {inicial}
                    </span>
                    <span>
                      <strong>{aluno.nome}</strong>
                      <small>{papel}</small>
                    </span>
                    <span />
                    <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
