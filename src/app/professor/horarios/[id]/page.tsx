import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarHorario, apagarHorario } from '@/lib/actions/professor'
import { DIAS_SEMANA } from '@/lib/dias-semana'
import { PageHeader } from '@/components/page-header'
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
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-sm space-y-[26px]">
        <PageHeader voltar="/dashboard/horarios" titulo="Editar horário" />

        {erro && <MensagemErro>{erro}</MensagemErro>}

        <form action={atualizarHorario} className="space-y-[14px]">
          <input type="hidden" name="horarioId" value={horario.id} />

          <div className="space-y-[6px]">
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

          <div className="flex gap-[10px]">
            <div className="flex-1 space-y-[6px]">
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
            <div className="flex-1 space-y-[6px]">
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
            <p className="text-[12.5px] leading-[1.5]" style={{ color: 'var(--color-tinta-suave)' }}>
              Alunos confirmados neste horário: {alunosConfirmados.join(', ')}
            </p>
          )}

          <SubmitButton
            textoAGuardar="A guardar..."
            className="flex h-[52px] w-full items-center justify-center rounded-[13px] bg-[var(--color-azul-fundo)] text-[15.5px] font-semibold text-white shadow-[0_7px_18px_rgba(27,79,122,.26)] disabled:opacity-50"
          >
            Guardar alterações
          </SubmitButton>
        </form>

        <BotaoAcaoDestruir
          label="Apagar horário"
          variante="bloco"
          mensagem={
            alunosConfirmados.length > 0
              ? 'Tens a certeza que queres apagar este horário? Já tens alunos confirmados nele — considera bloqueá-lo em vez de apagar.'
              : 'Tens a certeza que queres apagar este horário? Esta ação é irreversível.'
          }
          action={apagarHorario}
        >
          <input type="hidden" name="horarioId" value={horario.id} />
        </BotaoAcaoDestruir>
      </div>
    </main>
  )
}
