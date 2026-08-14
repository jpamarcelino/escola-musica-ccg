import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { confirmarHorario, recusarPedido } from '@/lib/actions/professor'
import { PageHeader } from '@/components/page-header'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { EmptyState } from '@/components/empty-state'

type Pedido = {
  id: number
  mensagem: string | null
  alunos: {
    nome: string
    encarregado: { telefone: string | null } | null
  } | null
  instrumentos: { nome: string } | null
  disponibilidades_selecionadas: {
    horario_id: number
    horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
  }[]
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('perfis_escola')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: pedidosData } = await supabase
    .from('matriculas')
    .select(
      'id, mensagem, alunos(nome, encarregado:profiles!alunos_encarregado_id_fkey(telefone)), instrumentos(nome), disponibilidades_selecionadas(horario_id, horarios(dia_semana, hora_inicio, hora_fim))'
    )
    .eq('professor_id', user.id)
    .eq('estado', 'a_escolher')
    .order('criado_em')
  const pedidos = (pedidosData ?? []) as unknown as Pedido[]

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard" titulo="Pedidos de Aula" />

        {erro && <p className="text-sm text-red-600">{decodeURIComponent(erro)}</p>}

        <section className="space-y-3">
          {pedidos.length === 0 && (
            <EmptyState
              titulo="Não há pedidos pendentes"
              descricao="Está tudo em dia — os novos pedidos de aula aparecem aqui."
            />
          )}
          {pedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="space-y-2 rounded border border-foreground/15 p-4"
            >
              <p className="text-sm">
                <strong>{pedido.alunos?.nome}</strong> — {pedido.instrumentos?.nome}
              </p>
              {pedido.alunos?.encarregado?.telefone && (
                <p className="text-xs text-foreground/60">
                  Telemóvel:{' '}
                  <a href={`tel:${pedido.alunos!.encarregado!.telefone}`} className="underline">
                    {pedido.alunos!.encarregado!.telefone}
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
                    <BotaoAcaoDestruir
                      key={d.horario_id}
                      label={label}
                      tom="neutro"
                      mensagem={`Confirmar a aula de ${pedido.alunos?.nome} (${pedido.instrumentos?.nome}) — ${label}?`}
                      action={confirmarHorario}
                    >
                      <input type="hidden" name="matriculaId" value={pedido.id} />
                      <input type="hidden" name="horarioId" value={d.horario_id} />
                    </BotaoAcaoDestruir>
                  )
                })}
                <BotaoAcaoDestruir
                  label="Recusar"
                  mensagem={`Recusar o pedido de ${pedido.alunos?.nome} (${pedido.instrumentos?.nome})? O pedido será apagado.`}
                  action={recusarPedido}
                >
                  <input type="hidden" name="matriculaId" value={pedido.id} />
                </BotaoAcaoDestruir>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
