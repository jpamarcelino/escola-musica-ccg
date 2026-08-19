import { redirect, notFound } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { pedirReposicao } from '@/lib/actions/aluno'
import { SubmitButton } from '@/components/submit-button'
import { classesCampo } from '@/components/campo-formulario'
import { MensagemErro, MensagemNota } from '@/components/mensagem'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { formatarDataEscolar, formatarHora, hojeISO } from '@ccg/core'

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
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <header>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
            Aula desmarcada
          </p>
          <h1
            className="mt-[6px] text-[24px] font-semibold leading-[1.2]"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--color-azul-fundo)' }}
          >
            Queres pedir reposição?
          </h1>
          <p className="mt-[8px] text-sm text-foreground/60">
            {aula.instrumento_nome} de{' '}
            {formatarDataEscolar(aula.data, { weekday: 'long', day: 'numeric', month: 'long' })},{' '}
            {formatarHora(aula.hora_inicio)}–{formatarHora(aula.hora_fim)}.
          </p>
        </header>

        {erro && <MensagemErro>{erro}</MensagemErro>}

        <MensagemNota>
          A reposição está sujeita à disponibilidade do professor, não sendo garantida.
        </MensagemNota>

        {vagas.length === 0 ? (
          <>
            {/* Sem vagas não se cria pedido nenhum. Um pedido vazio ficava
                na lista do professor a pedir uma coisa que ele não tem
                como dar, e o aluno ficava à espera de resposta. */}
            <p className="text-sm text-foreground/70">
              De momento, o professor não tem horários de reposição disponíveis. Contacte
              diretamente o professor para verificar outras possibilidades.
            </p>
            <LigacaoTerciaria href={`/aluno/${alunoId}/horario`}>Voltar à agenda</LigacaoTerciaria>
          </>
        ) : (
          <form action={pedirReposicao} className="space-y-5">
            <input type="hidden" name="aulaId" value={aula.id} />
            <input type="hidden" name="alunoId" value={alunoId} />

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">
                Horários que te dão jeito
              </legend>
              {/* Vários, de propósito: quantas mais opções o professor
                  tiver, mais depressa consegue encaixar. Escolher não
                  reserva — a vaga só fica ocupada quando ele aceitar. */}
              <p className="text-sm text-foreground/60">
                Escolhe todos os que puderes. Escolher não reserva o horário.
              </p>
              <div className="space-y-2">
                {vagas.map((v) => (
                  <label key={v.id} className="lista-item flex items-center gap-[12px]">
                    <input
                      type="checkbox"
                      name="horarios"
                      value={v.id}
                      className="h-[20px] w-[20px] shrink-0 accent-[var(--color-azul-fundo)]"
                    />
                    <span>
                      <span className="lista-item-titulo block">
                        {formatarDataEscolar(v.data, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <span className="lista-item-sub">
                        {formatarHora(v.hora_inicio)}–{formatarHora(v.hora_fim)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1">
              <label htmlFor="mensagem" className="block text-[13px] font-medium">
                Mensagem para o professor <span className="text-foreground/50">(opcional)</span>
              </label>
              <textarea
                id="mensagem"
                name="mensagem"
                rows={3}
                maxLength={500}
                className={classesCampo}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <SubmitButton
                textoAGuardar="A enviar…"
                className="flex h-[52px] items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] px-7 text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-raised)] disabled:opacity-50 motion-reduce:transition-none"
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
