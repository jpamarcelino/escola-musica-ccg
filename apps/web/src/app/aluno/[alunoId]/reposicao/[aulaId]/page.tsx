import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { pedirReposicao } from '@/lib/actions/aluno'
import { SubmitButton } from '@/components/submit-button'
import { classesCampo } from '@/components/campo-formulario'
import { MensagemErro, MensagemNota } from '@/components/mensagem'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { formatarDataEscolar, formatarHora, hojeISO } from '@ccg/core'
import { CalendarClock, ChevronLeft } from 'lucide-react'

type Vaga = {
  id: number
  data: string
  hora_inicio: string
  hora_fim: string
}

// "Queres pedir reposição?", logo a seguir a desmarcar.
//
// A pergunta vem depois e não antes: primeiro resolve-se o que a pessoa
// veio fazer, e só depois se pergunta se quer repor. E é uma pergunta com
// saída — desmarcar sem pedir nada é uma resposta legítima, e por isso a
// ligação para sair está ao lado do botão e não escondida.
export default async function PedirReposicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ alunoId: string; aulaId: string }>
  searchParams: Promise<{ erro?: string }>
}) {
  const { alunoId, aulaId } = await params
  const { erro } = await searchParams
  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
  }

  const { data: aula } = await supabase
    .from('aulas_desmarcadas')
    .select('id, data, hora_inicio, hora_fim, instrumento_nome, professor_id, reposicao_estado, aluno_id')
    .eq('id', Number(aulaId))
    .eq('aluno_id', alunoId)
    .maybeSingle()

  // A RLS já limita a aula às da própria conta; o maybeSingle a null
  // cobre tanto "não existe" como "não é tua".
  if (!aula) {
    notFound()
  }

  // Uma aula só origina um pedido. Se já o tem, não há nada a fazer aqui.
  if (aula.reposicao_estado !== 'sem_pedido') {
    redirect(`/aluno/${alunoId}/horario`)
  }

  const { data: vagasData } = await supabase
    .from('horarios_reposicao')
    .select('id, data, hora_inicio, hora_fim')
    .eq('professor_id', aula.professor_id)
    .eq('estado', 'disponivel')
    .gte('data', hojeISO())
    .order('data')
    .order('hora_inicio')

  const vagas = (vagasData ?? []) as Vaga[]

  return (
    <main id="conteudo-principal" className="pinterest-pedir-reposicao">
      <div className="pinterest-pedir-reposicao-folha">
        <header className="pinterest-pedir-reposicao-cabecalho">
          <Link href={`/aluno/${alunoId}/horario`} className="pinterest-pedir-reposicao-voltar" aria-label="Voltar ao horário">
            <ChevronLeft size={24} strokeWidth={2.1} aria-hidden="true" />
          </Link>
          <div>
            <h1>Marcar reposição</h1>
            <p>Escolhe os horários que te dão jeito.</p>
          </div>
        </header>

        <section className="pinterest-pedir-reposicao-aula" aria-label="Aula desmarcada">
          <span aria-hidden="true"><CalendarClock size={23} strokeWidth={1.9} /></span>
          <div>
            <small>Aula desmarcada</small>
            <strong>{aula.instrumento_nome}</strong>
            <p>
              {formatarDataEscolar(aula.data, { weekday: 'long', day: 'numeric', month: 'long' })},{' '}
              {formatarHora(aula.hora_inicio)}–{formatarHora(aula.hora_fim)}
            </p>
          </div>
        </section>

        {erro && <MensagemErro>{erro}</MensagemErro>}

        <div className="pinterest-pedir-reposicao-nota">
          <MensagemNota>
            A reposição depende da disponibilidade do professor e só fica marcada quando ele aceitar.
          </MensagemNota>
        </div>

        {vagas.length === 0 ? (
          <div className="pinterest-pedir-reposicao-vazio">
            {/* Sem vagas não se cria pedido nenhum. Um pedido vazio ficava
                na lista do professor a pedir uma coisa que ele não tem
                como dar, e o aluno ficava à espera de resposta. */}
            <strong>Sem horários disponíveis</strong>
            <p>De momento, o professor não tem vagas para reposição. Fala diretamente com ele para ver outras possibilidades.</p>
            <LigacaoTerciaria href={`/aluno/${alunoId}/horario`}>Voltar ao horário</LigacaoTerciaria>
          </div>
        ) : (
          <form action={pedirReposicao} className="pinterest-pedir-reposicao-formulario">
            <input type="hidden" name="aulaId" value={aula.id} />
            <input type="hidden" name="alunoId" value={alunoId} />

            <fieldset>
              <legend>Horários disponíveis</legend>
              {/* Vários, de propósito: quantas mais opções o professor
                  tiver, mais depressa consegue encaixar. Escolher não
                  reserva — a vaga só fica ocupada quando ele aceitar. */}
              <p>
                Podes escolher vários. Nenhum fica reservado até o professor aceitar.
              </p>
              <div className="pinterest-pedir-reposicao-opcoes">
                {vagas.map((v) => (
                  <label key={v.id}>
                    <input
                      type="checkbox"
                      name="horarios"
                      value={v.id}
                      className="pinterest-pedir-reposicao-checkbox"
                    />
                    <span>
                      <strong>
                        {formatarDataEscolar(v.data, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </strong>
                      <small>
                        {formatarHora(v.hora_inicio)}–{formatarHora(v.hora_fim)}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="pinterest-pedir-reposicao-mensagem">
              <label htmlFor="mensagem">
                Mensagem para o professor <span>(opcional)</span>
              </label>
              <textarea
                id="mensagem"
                name="mensagem"
                rows={3}
                maxLength={500}
                className={classesCampo}
              />
            </div>

            <div className="pinterest-pedir-reposicao-acoes">
              <SubmitButton
                textoAGuardar="A enviar…"
                className="pinterest-pedir-reposicao-enviar"
              >
                Pedir reposição
              </SubmitButton>
              <LigacaoTerciaria href={`/aluno/${alunoId}/horario`}>
                Não quero reposição
              </LigacaoTerciaria>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
