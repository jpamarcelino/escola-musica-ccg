import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { SubmitButton } from '@/components/submit-button'
import { registarRecomendacao } from '@/lib/actions/recomendacoes'

type ProfessorAderente = {
  id: string
  profiles: { nome: string } | null
}

type AlunoDoProfessor = {
  aluno_id: string
  estado: string
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
  searchParams: Promise<{ professor?: string; erro?: string }>
}) {
  const { professor: professorId, erro } = await searchParams

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

  const { data: professoresData } = await supabase
    .from('perfis_escola')
    .select('id, profiles(nome)')
    .eq('tipo', 'professor')
    .eq('adere_recomendacao', true)
  const professores = (professoresData ?? []) as unknown as ProfessorAderente[]
  professores.sort((a, b) => (a.profiles?.nome ?? '').localeCompare(b.profiles?.nome ?? ''))

  const { data: alunosData } = professorId
    ? await supabase
        .from('matriculas')
        .select('aluno_id, estado, alunos(nome), instrumentos(nome)')
        .eq('professor_id', professorId)
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
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin/recomendacoes" />
          <h1 className="text-2xl font-semibold text-foreground">Registar recomendação</h1>
        </div>

        {erro && (
          <p className="rounded border border-red-600/30 p-3 text-sm text-red-600">
            {decodeURIComponent(erro)}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="secao-titulo">1. Professor</h2>
          {professores.length === 0 ? (
            <p className="rounded border border-foreground/15 p-3 text-sm text-foreground/60">
              Nenhum professor aderiu ao Programa. A adesão marca-se na ficha de cada
              professor, em <strong>Professores</strong>. Sem adesão não pode haver
              recomendações — é o professor que suporta metade do benefício (Art. 5.º).
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {professores.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/recomendacoes/nova?professor=${p.id}`}
                  className={
                    professorId === p.id
                      ? 'rounded bg-brand px-3 py-2 text-sm text-white'
                      : 'rounded border border-foreground/20 px-3 py-2 text-sm'
                  }
                >
                  {p.profiles?.nome}
                </Link>
              ))}
            </div>
          )}
        </section>

        {professorId && (
          <form action={registarRecomendacao} className="space-y-6">
            <input type="hidden" name="professorId" value={professorId} />

            <section className="space-y-3">
              <h2 className="secao-titulo">2. Quem recomendou</h2>
              {alunosConfirmados.size === 0 ? (
                <p className="text-sm text-foreground/60">
                  Este professor não tem alunos com matrícula confirmada.
                </p>
              ) : (
                <select
                  name="recomendadorId"
                  required
                  defaultValue=""
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Escolhe o aluno…
                  </option>
                  {ordenarPorNome(alunosConfirmados).map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome}
                    </option>
                  ))}
                </select>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="secao-titulo">3. Novo aluno</h2>
              <select
                name="novoAlunoId"
                defaultValue=""
                className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
              >
                <option value="">Ainda não está na app — escrevo o nome</option>
                {ordenarPorNome(todosOsAlunos).map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="novoAlunoNomeLivre"
                placeholder="Nome do novo aluno (só se não estiver na lista)"
                className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
              />
            </section>

            <section className="space-y-3">
              <h2 className="secao-titulo">4. Confirmação administrativa</h2>
              <p className="text-sm text-foreground/60">
                O Art. 11.º só valida a recomendação depois de a secretaria confirmar a
                inscrição e o pagamento da inscrição e da primeira mensalidade. Sem estas
                datas, a recomendação fica registada e pode ser validada mais tarde.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <label
                    htmlFor="dataInscricao"
                    className="block text-xs font-medium text-foreground/60"
                  >
                    Data de inscrição
                  </label>
                  <input
                    id="dataInscricao"
                    name="dataInscricao"
                    type="date"
                    className="rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="dataPrimeiroPagamento"
                    className="block text-xs font-medium text-foreground/60"
                  >
                    Data do 1.º pagamento
                  </label>
                  <input
                    id="dataPrimeiroPagamento"
                    name="dataPrimeiroPagamento"
                    type="date"
                    className="rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="valorInscricao"
                    className="block text-xs font-medium text-foreground/60"
                  >
                    Valor da inscrição (€)
                  </label>
                  <input
                    id="valorInscricao"
                    name="valorInscricao"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="10.00"
                    className="w-28 rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="modalidade"
                  className="block text-xs font-medium text-foreground/60"
                >
                  Modalidade do novo aluno (deixa vazio para usar a da matrícula)
                </label>
                <input
                  id="modalidade"
                  name="modalidade"
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="observacoes"
                  className="block text-xs font-medium text-foreground/60"
                >
                  Observações
                </label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  rows={2}
                  className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="validarJa" />
                Já confirmei tudo — validar e atribuir já o mês grátis
              </label>
            </section>

            <SubmitButton
              textoAGuardar="A registar..."
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Registar
            </SubmitButton>
          </form>
        )}
      </div>
    </main>
  )
}
