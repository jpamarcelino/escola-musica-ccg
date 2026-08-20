import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { EmptyState } from '@/components/empty-state'
import { calcularIdade, formatarHora, type DiaSemana } from '@ccg/core'

type Linha = {
  id: number
  aluno_id: string
  alunos: { nome: string; data_nascimento: string | null } | null
  instrumentos: { nome: string } | null
  horarios: { dia_semana: DiaSemana; hora_inicio: string; hora_fim: string } | null
}

// Os alunos de um professor, numa lista.
//
// Já se chegava a cada aluno — mas só por dentro da agenda, entrando na
// aula do dia certo e depois no nome. Isso serve para preparar a aula de
// hoje; não serve para "quem é que eu tenho" nem para ir a um aluno de
// quinta-feira numa terça.
//
// A lista é por matrícula e não por pessoa: quem tem duas disciplinas
// aparece duas vezes, porque são duas aulas, dois horários e duas
// mensalidades. Juntá-las numa linha dava um nome com dois horários
// atrás e nenhum caminho claro para mexer num deles.
export default async function MeusAlunosPage() {
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }
  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data } = await supabase
    .from('matriculas')
    .select(
      'id, aluno_id, alunos(nome, data_nascimento), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim)'
    )
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .not('horario_final_id', 'is', null)

  const linhas = ((data ?? []) as unknown as Linha[]).sort((a, b) => {
    const nomeA = a.alunos?.nome ?? ''
    const nomeB = b.alunos?.nome ?? ''
    return nomeA.localeCompare(nomeB, 'pt')
  })

  // Quantas pessoas, e não quantas matrículas: é a resposta a "quantos
  // alunos tenho".
  const pessoas = new Set(linhas.map((l) => l.aluno_id)).size

  return (
    <main id="conteudo-principal" className="partitura-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Quem ensinas</p>
            <h1>Alunos</h1>
            <p>
              {pessoas} {pessoas === 1 ? 'aluno' : 'alunos'}
              {linhas.length !== pessoas &&
                ` · ${linhas.length} ${linhas.length === 1 ? 'matrícula' : 'matrículas'}`}
            </p>
          </div>
        </header>

        {linhas.length === 0 ? (
          <EmptyState
            titulo="Ainda não tens alunos"
            descricao="Aparecem aqui assim que confirmares um pedido de aula."
          />
        ) : (
          <div className="space-y-2 pt-2">
            {linhas.map((l) => {
              const idade = calcularIdade(l.alunos?.data_nascimento)
              return (
                <Link
                  key={l.id}
                  href={`/dashboard/meus-alunos/${l.id}`}
                  className="lista-item flex items-center gap-3"
                >
                  <span className="flex-1">
                    <span className="lista-item-titulo block">{l.alunos?.nome}</span>
                    <span className="lista-item-sub">
                      {[
                        l.instrumentos?.nome,
                        l.horarios &&
                          `${l.horarios.dia_semana}, ${formatarHora(l.horarios.hora_inicio)}–${formatarHora(l.horarios.hora_fim)}`,
                        idade !== null ? `${idade} anos` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
