import Link from 'next/link'
import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import {
  confirmarHorario,
  cancelarMatricula,
  alternarEstadoHorario,
  atualizarInstrumentos,
  atualizarFoto,
  criarHorarios,
  apagarHorarios,
  bloquearHorarios,
} from '@/lib/actions/professor'
import { cancelarPedido } from '@/lib/actions/aluno'
import { DIAS_SEMANA } from '@/lib/dias-semana'
import { BotaoSelecionarTodos } from '@/components/horarios-selecionar-todos'
import { BotaoBloquearSelecionados } from '@/components/horarios-bloquear-selecionados'
import { BotaoConfirmarHorario } from '@/components/confirmar-horario-botao'

type Matricula = {
  id: number
  estado: string
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
}

type Pedido = {
  id: number
  mensagem: string | null
  profiles: { nome: string; telefone: string | null } | null
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
}

type Confirmado = {
  id: number
  horario_final_id: number | null
  instrumentos: { nome: string } | null
  profiles: { nome: string; telefone: string | null } | null
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
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
    .select('nome, tipo, admin, programa, foto_url')
    .eq('id', user.id)
    .single()

  let matriculas: Matricula[] = []
  if (profile?.tipo === 'aluno') {
    const { data } = await supabase
      .from('matriculas')
      .select(
        'id, estado, instrumentos(nome), profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim)'
      )
      .eq('aluno_id', user.id)
      .order('criado_em', { ascending: false })
    matriculas = (data ?? []) as unknown as Matricula[]
  }

  let pedidos: Pedido[] = []
  let horarios: HorarioProfessor[] = []
  let confirmados: Confirmado[] = []
  let confirmadosPorHorario = new Map<number, string[]>()
  let todosInstrumentos: { id: number; nome: string }[] = []
  let meusInstrumentos: { id: number; nome: string; especialidade: string | null }[] = []

  if (profile?.tipo === 'professor') {
    const { data: instrumentosData } = await supabase
      .from('instrumentos')
      .select('id, nome')
      .eq('programa', profile.programa)
      .order('nome')
    todosInstrumentos = instrumentosData ?? []

    const { data: meusInstrumentosData } = await supabase
      .from('professor_instrumentos')
      .select('especialidade, instrumentos(id, nome)')
      .eq('professor_id', user.id)
    meusInstrumentos = (
      (meusInstrumentosData ?? []) as unknown as {
        especialidade: string | null
        instrumentos: { id: number; nome: string } | null
      }[]
    )
      .filter((r) => r.instrumentos !== null)
      .map((r) => ({ ...r.instrumentos!, especialidade: r.especialidade }))

    const { data: pedidosData } = await supabase
      .from('matriculas')
      .select(
        'id, mensagem, profiles!matriculas_aluno_id_fkey(nome, telefone), instrumentos(nome), disponibilidades_selecionadas(horario_id, horarios(dia_semana, hora_inicio, hora_fim))'
      )
      .eq('professor_id', user.id)
      .eq('estado', 'a_escolher')
      .order('criado_em')
    pedidos = (pedidosData ?? []) as unknown as Pedido[]

    const { data: horariosData } = await supabase
      .from('horarios')
      .select('id, dia_semana, hora_inicio, hora_fim, estado')
      .eq('professor_id', user.id)
      .order('dia_semana')
      .order('hora_inicio')
    horarios = (horariosData ?? []) as unknown as HorarioProfessor[]

    const { data: confirmadosData } = await supabase
      .from('matriculas')
      .select(
        'id, horario_final_id, instrumentos(nome), profiles!matriculas_aluno_id_fkey(nome, telefone), horarios(dia_semana, hora_inicio, hora_fim)'
      )
      .eq('professor_id', user.id)
      .eq('estado', 'confirmado')
      .order('criado_em')
    confirmados = (confirmadosData ?? []) as unknown as Confirmado[]

    confirmadosPorHorario = new Map()
    for (const c of confirmados) {
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
            : 'w-full max-w-sm space-y-4 text-center'
        }
      >
        <div
          className={`entrada-esquerda ${largo ? 'text-left' : ''}`}
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <h1 className="text-2xl">
            <span className="saudacao">Bem-vindo,</span>{' '}
            <span className="font-semibold text-foreground">{profile?.nome}</span>
          </h1>
          <p className="text-sm text-foreground/60">
            Estás autenticado como <strong>{profile?.tipo}</strong>
            {profile?.programa &&
              ` — Escola de ${profile.programa === 'musica' ? 'Música' : 'Dança'}`}
            .
          </p>
          {profile?.admin && (
            <Link href="/admin" className="text-sm underline">
              Visão geral (diretor)
            </Link>
          )}
        </div>

        {profile?.tipo === 'aluno' && (
          <div className="space-y-4 text-left">
            {matriculas.length === 0 && (
              <p
                className="entrada-esquerda text-sm text-foreground/60"
                style={{ '--card-index': 1 } as CSSProperties}
              >
                Ainda não pediste nenhuma aula.
              </p>
            )}
            {matriculas.map((matricula, idx) => (
              <div
                key={matricula.id}
                className="entrada-esquerda space-y-3 rounded border border-foreground/15 p-4"
                style={{ '--card-index': idx + 1 } as CSSProperties}
              >
                {matricula.estado === 'a_escolher' && (
                  <>
                    <p className="text-sm">
                      Pedido enviado para{' '}
                      <strong>{matricula.profiles?.nome}</strong> (
                      {matricula.instrumentos?.nome}). A aguardar que o
                      professor escolha o horário final.
                    </p>
                    <form action={cancelarPedido}>
                      <input
                        type="hidden"
                        name="matriculaId"
                        value={matricula.id}
                      />
                      <button
                        type="submit"
                        className="w-full rounded border border-red-600/40 py-2 text-sm text-red-600 hover:bg-red-600/5"
                      >
                        Cancelar pedido
                      </button>
                    </form>
                  </>
                )}
                {matricula.estado === 'confirmado' && matricula.horarios && (
                  <p className="text-sm">
                    Aula confirmada com <strong>{matricula.profiles?.nome}</strong>{' '}
                    ({matricula.instrumentos?.nome}): {matricula.horarios.dia_semana}
                    , {matricula.horarios.hora_inicio.slice(0, 5)}–
                    {matricula.horarios.hora_fim.slice(0, 5)}.
                  </p>
                )}
              </div>
            ))}
            <Link
              href="/aluno/pedido"
              className="botao-cartao entrada-esquerda"
              style={{ '--card-index': matriculas.length + 1 } as CSSProperties}
            >
              Pedir aula
            </Link>
          </div>
        )}

        {profile?.tipo === 'professor' && (
          <div className="space-y-6">
            {erroHorarios && (
              <p className="rounded border border-red-600/30 p-3 text-sm text-red-600">
                {erroHorarios}
              </p>
            )}

            <section className="space-y-3">
              <h2 className="font-semibold">A tua foto</h2>
              <div className="flex items-center gap-4">
                {profile.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.foto_url}
                    alt={profile.nome}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground/10 text-xs text-foreground/50">
                    Sem foto
                  </div>
                )}
                <form action={atualizarFoto} className="flex items-center gap-2">
                  <input
                    type="file"
                    name="foto"
                    accept="image/*"
                    required
                    className="text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded border border-foreground/20 px-3 py-1 text-sm hover:bg-foreground/5"
                  >
                    Carregar foto
                  </button>
                </form>
              </div>
            </section>

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
                  {pedido.profiles?.telefone && (
                    <p className="text-xs text-foreground/60">
                      Telemóvel:{' '}
                      <a href={`tel:${pedido.profiles.telefone}`} className="underline">
                        {pedido.profiles.telefone}
                      </a>
                    </p>
                  )}
                  {pedido.mensagem && (
                    <p className="rounded bg-foreground/5 p-2 text-sm italic text-foreground/70">
                      “{pedido.mensagem}”
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {pedido.disponibilidades_selecionadas.map((d) => {
                      const label = `${d.horarios?.dia_semana}, ${d.horarios?.hora_inicio.slice(0, 5)}–${d.horarios?.hora_fim.slice(0, 5)}`
                      return (
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
                          <BotaoConfirmarHorario
                            label={label}
                            mensagemConfirmacao={`Confirmar a aula de ${pedido.profiles?.nome} (${pedido.instrumentos?.nome}) — ${label}? Tens a certeza?`}
                          />
                        </form>
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Alunos confirmados</h2>
              {confirmados.length === 0 && (
                <p className="text-sm text-foreground/60">
                  Ainda não tens alunos confirmados.
                </p>
              )}
              {confirmados.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-foreground/15 px-4 py-2 text-sm"
                >
                  <div>
                    <p>
                      <strong>{c.profiles?.nome}</strong> — {c.instrumentos?.nome}
                      {c.horarios && (
                        <>
                          : {c.horarios.dia_semana},{' '}
                          {c.horarios.hora_inicio.slice(0, 5)}–
                          {c.horarios.hora_fim.slice(0, 5)}
                        </>
                      )}
                    </p>
                    {c.profiles?.telefone && (
                      <p className="text-xs text-foreground/60">
                        Telemóvel:{' '}
                        <a href={`tel:${c.profiles.telefone}`} className="underline">
                          {c.profiles.telefone}
                        </a>
                      </p>
                    )}
                  </div>
                  <form action={cancelarMatricula}>
                    <input type="hidden" name="matriculaId" value={c.id} />
                    <button
                      type="submit"
                      className="rounded border border-red-600/40 px-3 py-1 text-sm text-red-600 hover:bg-red-600/5"
                    >
                      Cancelar matrícula
                    </button>
                  </form>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Os teus horários</h2>
              <form id="apagar-horarios-form" action={apagarHorarios} />
              <form id="bloquear-horarios-form" action={bloquearHorarios} />
              {horarios.length === 0 && (
                <p className="text-sm text-foreground/60">
                  Ainda não tens horários definidos.
                </p>
              )}
              {horarios.length > 0 && (
                <div className="overflow-x-auto rounded border border-foreground/15">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-foreground/15 text-xs text-foreground/60">
                        <th className="w-8 px-3 py-2"></th>
                        <th className="px-3 py-2 font-medium">Dia</th>
                        <th className="px-3 py-2 font-medium">Horário</th>
                        <th className="px-3 py-2 font-medium">Estado</th>
                        <th className="px-3 py-2 font-medium">Alunos</th>
                        <th className="px-3 py-2 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horarios.map((h) => (
                        <tr key={h.id} className="border-b border-foreground/10 last:border-0">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              name="horarioIds"
                              value={h.id}
                              form="apagar-horarios-form"
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{h.dia_semana}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {h.hora_inicio.slice(0, 5)}–{h.hora_fim.slice(0, 5)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {h.estado === 'bloqueado' ? (
                              <span className="text-foreground/50">Bloqueado</span>
                            ) : (
                              'Aberto'
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-foreground/60">
                            {confirmadosPorHorario.get(h.id)?.join(', ') ?? '—'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/professor/horarios/${h.id}`}
                                className="rounded border border-foreground/20 px-3 py-1 text-sm hover:bg-foreground/5"
                              >
                                Editar
                              </Link>
                              <form action={alternarEstadoHorario}>
                                <input type="hidden" name="horarioId" value={h.id} />
                                <input
                                  type="hidden"
                                  name="novoEstado"
                                  value={h.estado === 'aberto' ? 'bloqueado' : 'aberto'}
                                />
                                <button
                                  type="submit"
                                  className="rounded border border-foreground/20 px-3 py-1 text-sm"
                                >
                                  {h.estado === 'aberto' ? 'Bloquear' : 'Desbloquear'}
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {horarios.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <BotaoSelecionarTodos />
                  <button
                    type="submit"
                    form="apagar-horarios-form"
                    className="rounded border border-red-600/40 px-3 py-1 text-sm text-red-600 hover:bg-red-600/5"
                  >
                    Apagar selecionados
                  </button>
                  <BotaoBloquearSelecionados />
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Disciplinas que ensinas</h2>
              <p className="text-xs text-foreground/50">
                A especialidade é opcional — usa-a quando ensinas uma
                disciplina de forma diferente de outros professores (ex:
                &quot;Piano clássico&quot; vs. &quot;Piano jazz/rock&quot;).
                Aparece por baixo do teu nome quando um aluno escolher essa
                disciplina.
              </p>
              <form action={atualizarInstrumentos} className="space-y-3">
                <div className="space-y-2">
                  {todosInstrumentos.map((i) => {
                    const meu = meusInstrumentos.find((m) => m.id === i.id)
                    return (
                      <div key={i.id} className="flex items-center gap-2 text-sm">
                        <label className="flex w-40 shrink-0 items-center gap-2">
                          <input
                            type="checkbox"
                            name="instrumentos"
                            value={i.id}
                            defaultChecked={meu !== undefined}
                          />
                          {i.nome}
                        </label>
                        <input
                          type="text"
                          name={`especialidade_${i.id}`}
                          defaultValue={meu?.especialidade ?? ''}
                          placeholder="Especialidade (opcional)"
                          className="w-full rounded border border-foreground/20 bg-background px-3 py-1 text-sm"
                        />
                      </div>
                    )
                  })}
                </div>
                <button
                  type="submit"
                  className="rounded border border-foreground/20 px-3 py-1 text-sm"
                >
                  Guardar disciplinas
                </button>
              </form>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Criar horários</h2>
              <p className="text-xs text-foreground/50">
                Os horários não são específicos de uma disciplina — servem
                para qualquer uma das que ensinas. Preenche só os dias em que
                dás aulas; deixa os outros em branco.
              </p>
              <form
                action={criarHorarios}
                className="space-y-3 rounded border border-foreground/15 p-4"
              >
                <div className="space-y-2">
                  {DIAS_SEMANA.map((dia, i) => (
                    <div key={dia} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-sm">{dia}</span>
                      <input
                        name={`inicio_${i}`}
                        type="time"
                        className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                      />
                      <span className="text-sm text-foreground/50">até</span>
                      <input
                        name={`fim_${i}`}
                        type="time"
                        className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
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

                <button
                  type="submit"
                  className="w-full rounded bg-brand py-2 text-sm text-white hover:bg-brand-hover"
                >
                  Criar horários
                </button>
              </form>
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
