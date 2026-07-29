import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cancelarPedido, cancelarMatricula } from '@/lib/actions/aluno'
import { formatarSala } from '@/lib/sala'
import { formatarHora } from '@/lib/horarios-grade'
import { proximaOcorrenciaDoDia } from '@/lib/datas'
import { BackButton } from '@/components/back-button'
import { BotaoCancelarMatricula } from '@/components/cancelar-matricula-botao'

type Matricula = {
  id: number
  estado: string
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
  horarios: {
    dia_semana: string
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

export default async function ConsultarHorarioPage({
  params,
}: {
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: aluno } = await supabase
    .from('alunos')
    .select('nome')
    .eq('id', alunoId)
    .eq('encarregado_id', user.id)
    .maybeSingle()

  if (!aluno) {
    notFound()
  }

  const { data } = await supabase
    .from('matriculas')
    .select(
      'id, estado, instrumentos(nome), profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
    )
    .eq('aluno_id', alunoId)
    .in('estado', ['a_escolher', 'confirmado'])
    .order('criado_em', { ascending: false })
  const matriculas = (data ?? []) as unknown as Matricula[]

  const pendentes = matriculas.filter((m) => m.estado === 'a_escolher')
  const confirmadas = matriculas.filter((m) => m.estado === 'confirmado' && m.horarios)

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href={`/aluno/${alunoId}`} />
          <h1 className="text-2xl font-semibold text-foreground">Horário e Aulas</h1>
        </div>

        <section className="space-y-3">
          <h2 className="secao-titulo">Pedidos pendentes</h2>
          {pendentes.length === 0 ? (
            <p className="text-sm text-foreground/60">Não há pedidos por confirmar.</p>
          ) : (
            <div className="space-y-2">
              {pendentes.map((m) => (
                <div key={m.id} className="lista-item space-y-2">
                  <p className="lista-item-titulo">
                    {m.instrumentos?.nome} — {m.profiles?.nome}
                  </p>
                  <p className="lista-item-sub">A aguardar que o professor escolha o horário final.</p>
                  <form action={cancelarPedido}>
                    <input type="hidden" name="matriculaId" value={m.id} />
                    <button
                      type="submit"
                      className="w-full rounded border border-red-600/40 py-2 text-sm text-red-600 hover:bg-red-600/5"
                    >
                      Cancelar pedido
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="secao-titulo">Próximas aulas</h2>
          {confirmadas.length === 0 ? (
            <p className="text-sm text-foreground/60">Ainda não há aulas confirmadas.</p>
          ) : (
            <div className="space-y-2">
              {confirmadas.map((m) => {
                const horario = m.horarios!
                const proxima = proximaOcorrenciaDoDia(horario.dia_semana)
                return (
                  <div key={m.id} className="lista-item space-y-2">
                    <p className="lista-item-titulo">
                      {m.instrumentos?.nome} — {m.profiles?.nome}
                    </p>
                    <p className="lista-item-sub">
                      Próxima aula: {proxima} ({horario.dia_semana}),{' '}
                      {formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}
                      {formatarSala(horario.salas) && ` — ${formatarSala(horario.salas)}`}
                    </p>
                    <form action={cancelarMatricula}>
                      <input type="hidden" name="matriculaId" value={m.id} />
                      <BotaoCancelarMatricula
                        mensagemConfirmacao={`Tens a certeza que queres cancelar a matrícula de ${m.instrumentos?.nome} com ${m.profiles?.nome}? Esta ação é irreversível.`}
                      />
                    </form>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
