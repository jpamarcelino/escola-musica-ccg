import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarHorario, apagarHorario } from '@/lib/actions/professor'
import { DIAS_SEMANA } from '@/lib/dias-semana'

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
    .select('profiles!matriculas_aluno_id_fkey(nome)')
    .eq('horario_final_id', id)
    .eq('estado', 'confirmado')
  const alunosConfirmados = (
    (confirmadosData ?? []) as unknown as {
      profiles: { nome: string } | null
    }[]
  )
    .map((c) => c.profiles?.nome)
    .filter((nome): nome is string => Boolean(nome))

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <form
          action={atualizarHorario}
          className="space-y-4 rounded-lg border border-foreground/15 p-6"
        >
          <h1 className="text-xl font-semibold">Editar horário</h1>

          <input type="hidden" name="horarioId" value={horario.id} />

          <div className="space-y-1">
            <label htmlFor="diaSemana" className="block text-sm font-medium">
              Dia da semana
            </label>
            <select
              id="diaSemana"
              name="diaSemana"
              required
              defaultValue={horario.dia_semana}
              className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
            >
              {DIAS_SEMANA.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label htmlFor="horaInicio" className="block text-sm font-medium">
                Das
              </label>
              <input
                id="horaInicio"
                name="horaInicio"
                type="time"
                required
                defaultValue={horario.hora_inicio.slice(0, 5)}
                className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="horaFim" className="block text-sm font-medium">
                Até
              </label>
              <input
                id="horaFim"
                name="horaFim"
                type="time"
                required
                defaultValue={horario.hora_fim.slice(0, 5)}
                className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {alunosConfirmados.length > 0 && (
            <p className="text-xs text-foreground/50">
              Alunos confirmados neste horário: {alunosConfirmados.join(', ')}
            </p>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            className="w-full rounded bg-brand py-2 text-sm text-white hover:bg-brand-hover"
          >
            Guardar alterações
          </button>
        </form>

        <form action={apagarHorario}>
          <input type="hidden" name="horarioId" value={horario.id} />
          <button
            type="submit"
            className="w-full rounded border border-red-600/40 py-2 text-sm text-red-600 hover:bg-red-600/5"
          >
            Apagar horário
          </button>
        </form>

        <Link href="/dashboard" className="block text-center text-sm underline">
          Voltar
        </Link>
      </div>
    </main>
  )
}
