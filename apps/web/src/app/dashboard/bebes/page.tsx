import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Baby, Users } from 'lucide-react'
import { getAuthContext } from '@/lib/auth-context'
import { turmasDoProfessor } from '@/lib/bebes'
import { VoltarAtras } from '@/components/voltar-atras'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { EmptyState } from '@/components/empty-state'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { desmarcarDiaProfessor, desmarcarAulaProfessor } from '@/lib/actions/professor'
import {
  formatarHora,
  formatarDataEscolar,
  hojeISO,
  proximaAulaPorAcontecer,
  type DiaSemana,
} from '@ccg/core'

type Inscrito = {
  id: number
  aluno_id: string
  horario_final_id: number | null
  alunos: { nome: string } | null
}

// A Escola de Música para Bebés, vista de dentro por quem lhe dá aulas.
//
// Existe à parte da agenda porque é outra coisa: a agenda é a semana
// desta pessoa, e isto é uma turma da escola — com hora que ela não
// escolheu, uma lista de inscritos que não são "os alunos dela" no
// sentido das outras aulas, e um limite de dez.
//
// Só entra quem dá pelo menos uma turma. Não é uma página da escola, é a
// página de quem lá dá aulas.
export default async function BebesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; dia?: string; desmarcada?: string }>
}) {
  const { erro, dia, desmarcada } = await searchParams
  const { supabase, user } = await getAuthContext()

  if (!user) redirect('/login')

  const turmas = await turmasDoProfessor(supabase, user.id)
  if (turmas.length === 0) redirect('/dashboard')

  // Os horários espelhados desta pessoa, um por turma. É por eles que as
  // matrículas estão ligadas.
  const { data: horariosData } = await supabase
    .from('horarios')
    .select('id, turma_bebes_id, dia_semana, hora_inicio, hora_fim')
    .eq('professor_id', user.id)
    .not('turma_bebes_id', 'is', null)
  const horarios = (horariosData ?? []) as unknown as {
    id: number
    turma_bebes_id: number
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
  }[]

  const { data: inscritosData } = horarios.length
    ? await supabase
        .from('matriculas')
        .select('id, aluno_id, horario_final_id, alunos(nome)')
        .eq('professor_id', user.id)
        .eq('estado', 'confirmado')
        .in('horario_final_id', horarios.map((h) => h.id))
        .order('criado_em')
    : { data: [] }
  const inscritos = (inscritosData ?? []) as unknown as Inscrito[]

  const { data: desmarcadasData } = await supabase
    .from('aulas_desmarcadas')
    .select('matricula_id, data')
    .eq('professor_id', user.id)
    .gte('data', hojeISO())
  const canceladas = new Map<number, Set<string>>()
  for (const d of desmarcadasData ?? []) {
    const atual = canceladas.get(d.matricula_id) ?? new Set<string>()
    atual.add(d.data)
    canceladas.set(d.matricula_id, atual)
  }

  return (
    <main id="conteudo-principal" className="pinterest-bebes">
      <div className="pinterest-bebes-folha">
        <header className="pinterest-bebes-cabecalho">
          <VoltarAtras destino="/dashboard" className="pinterest-bebes-voltar" rotulo="Voltar ao início" tamanho={23} />
          <div>
            <h1>Música para Bebés</h1>
            <p>{turmas.length === 1 ? 'A tua turma' : 'As tuas turmas'}</p>
          </div>
        </header>

        {(erro || dia || desmarcada) && (
          <div className="pinterest-bebes-mensagem">
            {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}
            {dia && (
              <MensagemInfo>
                {dia === '1' ? '1 aula desmarcada.' : `${dia} aulas desmarcadas.`} As famílias foram
                avisadas.
              </MensagemInfo>
            )}
            {desmarcada && <MensagemInfo>Aula desmarcada. A família foi avisada.</MensagemInfo>}
          </div>
        )}

        {turmas.map((turma) => {
          const horario = horarios.find((h) => h.turma_bebes_id === turma.id)
          const daTurma = horario
            ? inscritos.filter((i) => i.horario_final_id === horario.id)
            : []
          const proxima = horario
            ? proximaAulaPorAcontecer(
                horario.dia_semana,
                horario.hora_inicio,
                horario.hora_fim,
                // A data só conta como desmarcada se TODOS os inscritos a
                // tiverem desmarcada: com um só a vir, o professor tem de
                // lá estar.
                new Set(
                  daTurma.length === 0
                    ? []
                    : [...(canceladas.get(daTurma[0].id) ?? new Set<string>())].filter((d) =>
                        daTurma.every((m) => canceladas.get(m.id)?.has(d))
                      )
                )
              )
            : null

          return (
            <section key={turma.id} className="pinterest-bebes-turma">
              <header>
                <Baby size={20} aria-hidden="true" />
                <div>
                  <strong>{turma.instrumentos?.nome}</strong>
                  <span>
                    {turma.dia_semana}, {formatarHora(turma.hora_inicio)}–
                    {formatarHora(turma.hora_fim)}
                  </span>
                </div>
                <b>
                  {daTurma.length}/{turma.capacidade}
                </b>
              </header>

              {/* O horário é da escola: quem o muda é a secretaria, e
                  dizê-lo aqui evita procurar um botão que não existe. */}
              <p className="pinterest-bebes-nota">
                O horário desta turma é definido pela secretaria. Podes desmarcar uma aula, mas não
                mudar a hora.
              </p>

              {proxima && (
                <div className="pinterest-bebes-proxima">
                  <p>
                    Próxima aula a{' '}
                    {formatarDataEscolar(proxima, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <BotaoAcaoDestruir
                    label="Desmarcar o dia"
                    variante="editorial"
                    titulo="Desmarcar esta aula?"
                    mensagem={`${turma.instrumentos?.nome}, ${formatarDataEscolar(proxima, { weekday: 'long', day: 'numeric', month: 'long' })}.\n\n${daTurma.length} ${daTurma.length === 1 ? 'família é avisada' : 'famílias são avisadas'} de que não há aula nesse dia.`}
                    action={desmarcarDiaProfessor}
                  >
                    <input type="hidden" name="data" value={proxima} />
                    <input type="hidden" name="voltarPara" value="/dashboard/bebes" />
                  </BotaoAcaoDestruir>
                </div>
              )}

              <h2>
                <Users size={17} aria-hidden="true" />
                Quem está inscrito
              </h2>

              {daTurma.length === 0 ? (
                <EmptyState
                  titulo="Ainda ninguém inscrito"
                  descricao="As inscrições são aceites pela secretaria e aparecem aqui."
                />
              ) : (
                <div className="pinterest-bebes-lista">
                  {daTurma.map((m) => {
                    const nome = m.alunos?.nome ?? ''
                    const proximaDele = horario
                      ? proximaAulaPorAcontecer(
                          horario.dia_semana,
                          horario.hora_inicio,
                          horario.hora_fim,
                          canceladas.get(m.id) ?? new Set<string>()
                        )
                      : null
                    return (
                      <article key={m.id} className="pinterest-bebes-aluno">
                        <Link href={`/dashboard/meus-alunos/${m.id}`}>
                          <span className="pinterest-bebes-inicial" aria-hidden="true">
                            {nome.trim().charAt(0).toUpperCase()}
                          </span>
                          <span>
                            <strong>{nome}</strong>
                            <small>
                              {proximaDele
                                ? `Próxima a ${formatarDataEscolar(proximaDele, { day: 'numeric', month: 'long' })}`
                                : 'Sem aulas marcadas'}
                            </small>
                          </span>
                          <ChevronRight size={19} aria-hidden="true" />
                        </Link>
                        {proximaDele && (
                          <div className="pinterest-bebes-desmarcar">
                            <p>Só esta criança</p>
                            <BotaoAcaoDestruir
                              label="Desmarcar"
                              variante="editorial"
                              titulo="Desmarcar a aula de quem?"
                              mensagem={`Fica desmarcada só a aula de ${formatarDataEscolar(proximaDele, { weekday: 'long', day: 'numeric', month: 'long' })}, de ${nome}. A turma continua a ter aula nesse dia.`}
                              action={desmarcarAulaProfessor}
                            >
                              <input type="hidden" name="matriculaId" value={m.id} />
                              <input type="hidden" name="data" value={proximaDele} />
                              <input type="hidden" name="horarioId" value={horario?.id ?? ''} />
                              <input type="hidden" name="voltarPara" value="/dashboard/bebes" />
                            </BotaoAcaoDestruir>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </main>
  )
}
