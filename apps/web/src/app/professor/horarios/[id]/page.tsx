import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarHorario, apagarHorario } from '@/lib/actions/professor'
import { DIAS_SEMANA } from '@ccg/core'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { SubmitButton } from '@/components/submit-button'
import { Rotulo, classesCampo } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'
import { VoltarAtras } from '@/components/voltar-atras'
import { Clock, Users } from 'lucide-react'

export default async function EditarHorarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ erro?: string }>
}) {
  const { id } = await params
  const { erro } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: horario } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, estado')
    .eq('id', id)
    .eq('professor_id', user.id)
    .maybeSingle()

  if (!horario) {
    notFound()
  }

  const { data: confirmadosData } = await supabase
    .from('matriculas')
    .select('alunos(nome)')
    .eq('horario_final_id', id)
    .eq('estado', 'confirmado')
  const alunosConfirmados = (
    (confirmadosData ?? []) as unknown as {
      alunos: { nome: string } | null
    }[]
  )
    .map((c) => c.alunos?.nome)
    .filter((nome): nome is string => Boolean(nome))

  const bloqueado = horario.estado === 'bloqueado'

  return (
    <main id="conteudo-principal" className="pinterest-editar-horario">
      <div className="pinterest-editar-horario-folha">
        <header className="pinterest-editar-horario-cabecalho">
          <VoltarAtras
            destino="/dashboard/horarios"
            className="pinterest-editar-horario-voltar"
            rotulo="Voltar aos horários"
            tamanho={23}
          />
          <div>
            <h1>Editar horário</h1>
            <p>Uma hora da tua disponibilidade semanal</p>
          </div>
        </header>

        {/* O que se está a editar, antes dos campos que o vão mudar. Sem
            isto, quem chega de uma lista de catorze horas iguais não tem
            como confirmar que abriu a certa. */}
        <div className="pinterest-editar-horario-contexto">
          <Clock size={20} aria-hidden="true" />
          <div>
            <strong>
              {horario.dia_semana} · {horario.hora_inicio.slice(0, 5)}–
              {horario.hora_fim.slice(0, 5)}
            </strong>
            <span>{bloqueado ? 'Bloqueado' : alunosConfirmados.length > 0 ? 'Ocupado' : 'Disponível'}</span>
          </div>
        </div>

        {erro && (
          <div className="pinterest-editar-horario-mensagem">
            <MensagemErro>{erro}</MensagemErro>
          </div>
        )}

        {/* Quem já lá está vem antes do formulário e não depois: mudar a
            hora de uma aula que tem alunos não é a mesma decisão que
            mudar uma vaga vazia, e isso tem de se saber antes de mexer
            nos campos. */}
        {alunosConfirmados.length > 0 && (
          <div className="pinterest-editar-horario-alunos">
            <Users size={19} aria-hidden="true" />
            <div>
              <strong>
                {alunosConfirmados.length}{' '}
                {alunosConfirmados.length === 1 ? 'aluno confirmado' : 'alunos confirmados'}
              </strong>
              <span>{alunosConfirmados.join(', ')}</span>
            </div>
          </div>
        )}

        <form action={atualizarHorario} className="pinterest-editar-horario-form">
          <input type="hidden" name="horarioId" value={horario.id} />

          <div className="pinterest-editar-horario-campo">
            <Rotulo htmlFor="diaSemana">Dia da semana</Rotulo>
            <select
              id="diaSemana"
              name="diaSemana"
              required
              defaultValue={horario.dia_semana}
              className={classesCampo}
            >
              {DIAS_SEMANA.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </div>

          <div className="pinterest-editar-horario-horas">
            <div className="pinterest-editar-horario-campo">
              <Rotulo htmlFor="horaInicio">Das</Rotulo>
              <input
                id="horaInicio"
                name="horaInicio"
                type="time"
                required
                min="10:00"
                max="22:00"
                defaultValue={horario.hora_inicio.slice(0, 5)}
                className={classesCampo}
              />
            </div>
            <div className="pinterest-editar-horario-campo">
              <Rotulo htmlFor="horaFim">Até</Rotulo>
              <input
                id="horaFim"
                name="horaFim"
                type="time"
                required
                min="10:00"
                max="22:00"
                defaultValue={horario.hora_fim.slice(0, 5)}
                className={classesCampo}
              />
            </div>
          </div>

          <SubmitButton textoAGuardar="A guardar…" className="pinterest-editar-horario-guardar">
            Guardar alterações
          </SubmitButton>
        </form>

        <section className="pinterest-editar-horario-perigo">
          <strong>Apagar horário</strong>
          <small>
            {alunosConfirmados.length > 0
              ? 'Já tens alunos confirmados nesta hora. Bloqueá-la em Horários fecha-a a pedidos novos sem desfazer as aulas que já existem.'
              : 'A vaga desaparece da tua semana. Não há como a recuperar.'}
          </small>
          <BotaoAcaoDestruir
            label="Apagar horário"
            variante="editorial"
            titulo="Apagar esta hora?"
            mensagem={
              alunosConfirmados.length > 0
                ? `${horario.dia_semana}, ${horario.hora_inicio.slice(0, 5)}–${horario.hora_fim.slice(0, 5)}, com ${alunosConfirmados.length} ${alunosConfirmados.length === 1 ? 'aluno confirmado' : 'alunos confirmados'}.\n\nConsidera bloqueá-la em vez de a apagar.`
                : `${horario.dia_semana}, ${horario.hora_inicio.slice(0, 5)}–${horario.hora_fim.slice(0, 5)}.\n\nA vaga desaparece da tua semana e não há como a recuperar.`
            }
            action={apagarHorario}
          >
            <input type="hidden" name="horarioId" value={horario.id} />
          </BotaoAcaoDestruir>
        </section>
      </div>
    </main>
  )
}
