import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { EmptyState } from '@/components/empty-state'
import { calcularIdade, formatarHora, type DiaSemana } from '@ccg/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
    <main id="conteudo-principal" className="pinterest-professor-alunos">
      <div className="pinterest-professor-alunos-folha">
        <header className="pinterest-professor-alunos-cabecalho">
          <Link href="/dashboard" className="pinterest-professor-alunos-voltar" aria-label="Voltar ao início">
            <ChevronLeft size={24} strokeWidth={2.1} aria-hidden="true" />
          </Link>
          <div>
            <h1>Alunos</h1>
            <p>
              {pessoas === 0 ? 'Quem ensinas aparece aqui.' : `${pessoas} ${pessoas === 1 ? 'aluno' : 'alunos'}`}
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
          <div className="pinterest-professor-alunos-lista">
            {linhas.map((l) => {
              const idade = calcularIdade(l.alunos?.data_nascimento)
              return (
                <Link
                  key={l.id}
                  href={`/dashboard/meus-alunos/${l.id}`}
                  className="pinterest-professor-aluno"
                >
                  <span className="pinterest-professor-aluno-avatar" aria-hidden="true">{l.alunos?.nome?.trim().slice(0, 1).toUpperCase() || 'A'}</span>
                  <span>
                    <strong>{l.alunos?.nome}</strong>
                    <small>
                      {[
                        l.instrumentos?.nome,
                        l.horarios &&
                          `${l.horarios.dia_semana}, ${formatarHora(l.horarios.hora_inicio)}–${formatarHora(l.horarios.hora_fim)}`,
                        idade !== null ? `${idade} anos` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </span>
                  <ChevronRight size={19} aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
