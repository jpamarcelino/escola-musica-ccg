import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { atualizarHorario, apagarHorario } from '@/lib/actions/professor'
import { DIAS_SEMANA } from '@/lib/dias-semana'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { SubmitButton } from '@/components/submit-button'
import { Rotulo, classesCampo } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'

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

  return (
    <main id="conteudo-principal" className="partitura-pagina editar-horario-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard/horarios" className="partitura-voltar" aria-label="Voltar aos horários">←</Link>
          <div><p className="partitura-sobretitulo">Disponibilidade semanal</p><h1>Editar horário</h1><p>{horario.dia_semana} · {horario.hora_inicio.slice(0, 5)}–{horario.hora_fim.slice(0, 5)}</p></div>
        </header>

        {erro && <MensagemErro>{erro}</MensagemErro>}

        <form action={atualizarHorario} className="editar-horario-form">
          <input type="hidden" name="horarioId" value={horario.id} />

          <div className="editar-horario-campo">
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

          <div className="editar-horario-horas">
            <div className="editar-horario-campo">
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
            <div className="editar-horario-campo">
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

          {alunosConfirmados.length > 0 && (
            <aside><strong>{alunosConfirmados.length} {alunosConfirmados.length === 1 ? 'aluno confirmado' : 'alunos confirmados'}</strong><span>{alunosConfirmados.join(', ')}</span></aside>
          )}

          <SubmitButton
            textoAGuardar="A guardar…"
            className="editar-horario-guardar"
          >
            Guardar alterações
          </SubmitButton>
        </form>

        <section className="detalhe-zona-perigo">
          <div><strong>Apagar horário</strong><small>{alunosConfirmados.length > 0 ? 'Já existem alunos confirmados; considera bloqueá-lo.' : 'Esta ação não pode ser anulada.'}</small></div>
          <BotaoAcaoDestruir label="Apagar horário" variante="editorial" mensagem={alunosConfirmados.length > 0 ? 'Tens a certeza que queres apagar este horário? Já tens alunos confirmados nele — considera bloqueá-lo em vez de apagar.' : 'Tens a certeza que queres apagar este horário? Esta ação é irreversível.'} action={apagarHorario}>
            <input type="hidden" name="horarioId" value={horario.id} />
          </BotaoAcaoDestruir>
        </section>
      </div>
    </main>
  )
}
