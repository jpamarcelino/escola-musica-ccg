import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cancelarPedido, cancelarMatricula } from '@/lib/actions/aluno'
import { formatarSala } from '@/lib/sala'
import { formatarHora } from '@/lib/horarios-grade'
import { proximaOcorrenciaDeAula } from '@/lib/datas'
import { PageHeader } from '@/components/page-header'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { EmptyState } from '@/components/empty-state'
import { GrupoLista, LinhaLista, TituloSeccao } from '@/components/lista'

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
  const confirmadas = matriculas
    .filter((m) => m.estado === 'confirmado' && m.horarios)
    .map((m) => ({
      ...m,
      proxima: proximaOcorrenciaDeAula(
        m.horarios!.dia_semana,
        m.horarios!.hora_inicio,
        m.horarios!.hora_fim
      ),
    }))
    .sort((a, b) =>
      a.proxima === b.proxima
        ? a.horarios!.hora_inicio.localeCompare(b.horarios!.hora_inicio)
        : a.proxima.localeCompare(b.proxima)
    )

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader
          voltar={`/aluno/${alunoId}`}
          titulo="Agenda"
          subtitulo={confirmadas[0] ? <>Próxima aula: {confirmadas[0].proxima}, às {formatarHora(confirmadas[0].horarios!.hora_inicio)}.</> : undefined}
        />

        {pendentes.length > 0 && (
          <section>
            <TituloSeccao contagem={pendentes.length}>Pedidos em curso</TituloSeccao>
            <div className="space-y-[8px]">
              {pendentes.map((m) => (
                <details key={m.id} className="rounded-[var(--radius-medium)] bg-[var(--color-surface-raised)] px-[16px] py-[14px]">
                  <summary className="cursor-pointer list-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary-mid)]">
                    <span className="block text-[15px] font-semibold">{m.instrumentos?.nome} · {m.profiles?.nome}</span>
                    <span className="mt-[3px] block text-[13px] text-[var(--color-text-secondary)]">A aguardar escolha do horário</span>
                  </summary>
                  <div className="mt-[14px] border-t border-[var(--color-linha)] pt-[14px]">
                    <BotaoAcaoDestruir
                      label="Cancelar pedido"
                      mensagem={`Tens a certeza que queres cancelar o pedido de ${m.instrumentos?.nome} com ${m.profiles?.nome}?`}
                      action={cancelarPedido}
                    >
                      <input type="hidden" name="matriculaId" value={m.id} />
                    </BotaoAcaoDestruir>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        <section>
          <TituloSeccao>Próximas aulas</TituloSeccao>
          {confirmadas.length === 0 ? (
            <EmptyState
              titulo="Ainda não há aulas confirmadas"
              descricao="Quando um professor confirmar o horário, a próxima aula aparece aqui."
            />
          ) : (
            <div className="space-y-[8px]">
              {confirmadas.map((m) => {
                const horario = m.horarios!
                return (
                  <details key={m.id} className="rounded-[var(--radius-medium)] bg-[var(--color-surface-raised)] px-[16px] py-[14px]">
                    <summary className="cursor-pointer list-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary-mid)]">
                      <span className="block text-[15px] font-semibold">{m.instrumentos?.nome} · {m.profiles?.nome}</span>
                      <span className="mt-[3px] block text-[13px] leading-[1.5] text-[var(--color-text-secondary)]">
                        {m.proxima} · {formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}
                        {formatarSala(horario.salas) && ` · ${formatarSala(horario.salas)}`}
                      </span>
                    </summary>
                    <div className="mt-[14px] border-t border-[var(--color-linha)] pt-[14px]">
                      <BotaoAcaoDestruir
                        label="Cancelar matrícula"
                        mensagem={`Tens a certeza que queres cancelar a matrícula de ${m.instrumentos?.nome} com ${m.profiles?.nome}? Esta ação é irreversível.`}
                        action={cancelarMatricula}
                      >
                        <input type="hidden" name="matriculaId" value={m.id} />
                      </BotaoAcaoDestruir>
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <TituloSeccao>Mais</TituloSeccao>
          <GrupoLista>
            <LinhaLista
              href={`/aluno/${alunoId}/pedido`}
              titulo="Pedir outra aula"
              contexto="Escolhe disciplina, professor e disponibilidade"
            />
          </GrupoLista>
        </section>
      </div>
    </main>
  )
}
