import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import {
  confirmarHorario,
  alternarEstadoHorario,
  atualizarInstrumentos,
  criarHorarios,
} from '@/lib/actions/professor'
import { DIAS_SEMANA } from '@/lib/dias-semana'

type Matricula = {
  estado: string
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
}

type Pedido = {
  id: number
  profiles: { nome: string } | null
  instrumentos: { nome: string } | null
  disponibilidades_selecionadas: {
    horario_id: number
    horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
  }[]
}

type HorarioProfessor = {
  id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  estado: string
  instrumentos: { nome: string } | null
}

type Confirmado = {
  horario_final_id: number | null
  profiles: { nome: string } | null
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ erroHorarios?: string }>
}) {
  const { erroHorarios } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, tipo')
    .eq('id', user.id)
    .single()

  let matricula: Matricula | null = null
  if (profile?.tipo === 'aluno') {
    const { data } = await supabase
      .from('matriculas')
      .select(
        'estado, instrumentos(nome), profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim)'
      )
      .eq('aluno_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    matricula = data as unknown as Matricula | null
  }

  let pedidos: Pedido[] = []
  let horarios: HorarioProfessor[] = []
  let confirmadosPorHorario = new Map<number, string[]>()
  let todosInstrumentos: { id: number; nome: string }[] = []
  let meusInstrumentos: { id: number; nome: string }[] = []

  if (profile?.tipo === 'professor') {
    const { data: instrumentosData } = await supabase
      .from('instrumentos')
      .select('id, nome')
      .order('nome')
    todosInstrumentos = instrumentosData ?? []

    const { data: meusInstrumentosData } = await supabase
      .from('professor_instrumentos')
      .select('instrumentos(id, nome)')
      .eq('professor_id', user.id)
    meusInstrumentos = (
      (meusInstrumentosData ?? []) as unknown as {
        instrumentos: { id: number; nome: string } | null
      }[]
    )
      .map((r) => r.instrumentos)
      .filter((i): i is { id: number; nome: string } => i !== null)

    const { data: pedidosData } = await supabase
      .from('matriculas')
      .select(
        'id, profiles!matriculas_aluno_id_fkey(nome), instrumentos(nome), disponibilidades_selecionadas(horario_id, horarios(dia_semana, hora_inicio, hora_fim))'
      )
      .eq('professor_id', user.id)
      .eq('estado', 'a_escolher')
      .order('criado_em')
    pedidos = (pedidosData ?? []) as unknown as Pedido[]

    const { data: horariosData } = await supabase
      .from('horarios')
      .select('id, dia_semana, hora_inicio, hora_fim, estado, instrumentos(nome)')
      .eq('professor_id', user.id)
      .order('dia_semana')
      .order('hora_inicio')
    horarios = (horariosData ?? []) as unknown as HorarioProfessor[]

    const { data: confirmadosData } = await supabase
      .from('matriculas')
      .select('horario_final_id, profiles!matriculas_aluno_id_fkey(nome)')
      .eq('professor_id', user.id)
      .eq('estado', 'confirmado')

    confirmadosPorHorario = new Map()
    for (const c of (confirmadosData ?? []) as unknown as Confirmado[]) {
      if (!c.horario_final_id) continue
      const nomes = confirmadosPorHorario.get(c.horario_final_id) ?? []
      nomes.push(c.profiles?.nome ?? '')
      confirmadosPorHorario.set(c.horario_final_id, nomes)
    }
  }

  const largo = profile?.tipo === 'professor'

  return (
    <main className="flex-1 flex justify-center p-6">
      <div
        className={
          largo
            ? 'w-full max-w-2xl space-y-6'
            : 'w-full max-w-sm space-y-4 text-center self-center'
        }
      >
        <div className={largo ? 'text-left' : ''}>
          <h1 className="text-xl font-semibold">Bem-vindo, {profile?.nome}</h1>
          <p className="text-sm text-foreground/60">
            Estás autenticado como <strong>{profile?.tipo}</strong>.
          </p>
        </div>

        {profile?.tipo === 'aluno' && (
          <div className="space-y-3 rounded border border-foreground/15 p-4 text-left">
            {!matricula && (
              <>
                <p className="text-sm text-foreground/60">
                  Ainda não pediste nenhuma aula.
                </p>
                <Link
                  href="/aluno/pedido"
                  className="block rounded bg-black py-2 text-center text-white"
                >
                  Pedir aula
                </Link>
              </>
            )}
            {matricula && matricula.estado === 'a_escolher' && (
              <p className="text-sm">
                Pedido enviado para{' '}
                <strong>{matricula.profiles?.nome}</strong> (
                {matricula.instrumentos?.nome}). A aguardar que o professor
                escolha o horário final.
              </p>
            )}
            {matricula && matricula.estado === 'confirmado' && matricula.horarios && (
              <p className="text-sm">
                Aula confirmada com <strong>{matricula.profiles?.nome}</strong>{' '}
                ({matricula.instrumentos?.nome}): {matricula.horarios.dia_semana}
                , {matricula.horarios.hora_inicio.slice(0, 5)}–
                {matricula.horarios.hora_fim.slice(0, 5)}.
              </p>
            )}
          </div>
        )}

        {profile?.tipo === 'professor' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="font-semibold">Pedidos por confirmar</h2>
              {pedidos.length === 0 && (
                <p className="text-sm text-foreground/60">
                  Não há pedidos pendentes.
                </p>
              )}
              {pedidos.map((pedido) => (
                <div
                  key={pedido.id}
                  className="space-y-2 rounded border border-foreground/15 p-4"
                >
                  <p className="text-sm">
                    <strong>{pedido.profiles?.nome}</strong> —{' '}
                    {pedido.instrumentos?.nome}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pedido.disponibilidades_selecionadas.map((d) => (
                      <form key={d.horario_id} action={confirmarHorario}>
                        <input
                          type="hidden"
                          name="matriculaId"
                          value={pedido.id}
                        />
                        <input
                          type="hidden"
                          name="horarioId"
                          value={d.horario_id}
                        />
                        <button
                          type="submit"
                          className="rounded border border-foreground/20 px-3 py-1 text-sm hover:bg-foreground/5"
                        >
                          {d.horarios?.dia_semana},{' '}
                          {d.horarios?.hora_inicio.slice(0, 5)}–
                          {d.horarios?.hora_fim.slice(0, 5)}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Os teus horários</h2>
              {horarios.length === 0 && (
                <p className="text-sm text-foreground/60">
                  Ainda não tens horários definidos.
                </p>
              )}
              {horarios.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded border border-foreground/15 px-4 py-2"
                >
                  <div className="text-sm">
                    <p>
                      {h.dia_semana}, {h.hora_inicio.slice(0, 5)}–
                      {h.hora_fim.slice(0, 5)} — {h.instrumentos?.nome}{' '}
                      {h.estado === 'bloqueado' && (
                        <span className="text-foreground/50">(bloqueado)</span>
                      )}
                    </p>
                    {(confirmadosPorHorario.get(h.id)?.length ?? 0) > 0 && (
                      <p className="text-xs text-foreground/60">
                        Alunos: {confirmadosPorHorario.get(h.id)?.join(', ')}
                      </p>
                    )}
                  </div>
                  <form action={alternarEstadoHorario}>
                    <input type="hidden" name="horarioId" value={h.id} />
                    <input
                      type="hidden"
                      name="novoEstado"
                      value={h.estado === 'aberto' ? 'bloqueado' : 'aberto'}
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded border border-foreground/20 px-3 py-1 text-sm"
                    >
                      {h.estado === 'aberto' ? 'Bloquear' : 'Desbloquear'}
                    </button>
                  </form>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Instrumentos que ensinas</h2>
              <form action={atualizarInstrumentos} className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {todosInstrumentos.map((i) => (
                    <label key={i.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="instrumentos"
                        value={i.id}
                        defaultChecked={meusInstrumentos.some((m) => m.id === i.id)}
                      />
                      {i.nome}
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  className="rounded border border-foreground/20 px-3 py-1 text-sm"
                >
                  Guardar instrumentos
                </button>
              </form>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Criar horários</h2>
              {meusInstrumentos.length === 0 ? (
                <p className="text-sm text-foreground/60">
                  Escolhe primeiro os instrumentos que ensinas, acima.
                </p>
              ) : (
                <form
                  action={criarHorarios}
                  className="space-y-3 rounded border border-foreground/15 p-4"
                >
                  <div className="space-y-1">
                    <label
                      htmlFor="instrumentoId"
                      className="block text-sm font-medium"
                    >
                      Instrumento
                    </label>
                    <select
                      id="instrumentoId"
                      name="instrumentoId"
                      required
                      className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                    >
                      {meusInstrumentos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-sm font-medium">
                      Dias da semana
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {DIAS_SEMANA.map((dia) => (
                        <label
                          key={dia}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input type="checkbox" name="dias" value={dia} />
                          {dia}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor="horaInicio"
                        className="block text-sm font-medium"
                      >
                        Das
                      </label>
                      <input
                        id="horaInicio"
                        name="horaInicio"
                        type="time"
                        required
                        className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor="horaFim"
                        className="block text-sm font-medium"
                      >
                        Até
                      </label>
                      <input
                        id="horaFim"
                        name="horaFim"
                        type="time"
                        required
                        className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="duracaoMinutos"
                      className="block text-sm font-medium"
                    >
                      Duração de cada aula (minutos)
                    </label>
                    <input
                      id="duracaoMinutos"
                      name="duracaoMinutos"
                      type="number"
                      min={5}
                      step={5}
                      defaultValue={50}
                      required
                      className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  {erroHorarios && (
                    <p className="text-sm text-red-600">{erroHorarios}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded bg-black py-2 text-sm text-white"
                  >
                    Criar horários
                  </button>
                </form>
              )}
            </section>
          </div>
        )}

        <form action={logout} className={largo ? '' : undefined}>
          <button
            type="submit"
            className="rounded border border-foreground/20 px-4 py-2"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  )
}
