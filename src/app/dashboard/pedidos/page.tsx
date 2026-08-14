import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { confirmarHorario, recusarPedido } from '@/lib/actions/professor'
import { PageHeader } from '@/components/page-header'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { EmptyState } from '@/components/empty-state'
import { SubmitButton } from '@/components/submit-button'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { agoraNaEscola } from '@/lib/datas'

type Pedido = {
  id: number
  criado_em: string
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
  searchParams: Promise<{ erro?: string; guardado?: string }>
}) {
  const { erro, guardado } = await searchParams
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
      'id, criado_em, mensagem, alunos(nome, encarregado:profiles!alunos_encarregado_id_fkey(telefone)), instrumentos(nome), disponibilidades_selecionadas(horario_id, horarios(dia_semana, hora_inicio, hora_fim))'
    )
    .eq('professor_id', user.id)
    .eq('estado', 'a_escolher')
    .order('criado_em')
  const pedidos = (pedidosData ?? []) as unknown as Pedido[]

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader
          voltar="/dashboard"
          titulo="Pedidos"
          subtitulo={pedidos.length > 0 ? <>{pedidos.length} {pedidos.length === 1 ? 'pedido aguarda' : 'pedidos aguardam'} resposta.</> : <>Está tudo em dia.</>}
        />

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}
        {guardado && <MensagemInfo>{decodeURIComponent(guardado)}</MensagemInfo>}

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
              className="space-y-[14px] rounded-[var(--radius-medium)] bg-[var(--color-surface-raised)] p-[16px]"
            >
              <div className="flex items-start justify-between gap-[12px]">
                <div>
                  <p className="text-[16px] font-bold">{pedido.alunos?.nome}</p>
                  <p className="mt-[2px] text-[13px] text-[var(--color-text-secondary)]">{pedido.instrumentos?.nome}</p>
                </div>
                <span className="shrink-0 rounded-[var(--radius-pill)] bg-white px-[10px] py-[5px] text-[12px] font-semibold text-[var(--color-warning)]">
                  {Math.max(0, Math.floor((agoraNaEscola().getTime() - new Date(pedido.criado_em).getTime()) / 86_400_000)) === 0
                    ? 'Hoje'
                    : `Há ${Math.max(1, Math.floor((agoraNaEscola().getTime() - new Date(pedido.criado_em).getTime()) / 86_400_000))} dias`}
                </span>
              </div>
              {pedido.alunos?.encarregado?.telefone && (
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  <a
                    href={`tel:${pedido.alunos!.encarregado!.telefone}`}
                    className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-4"
                  >
                    Ligar para{' '}
                    {pedido.alunos!.encarregado!.telefone}
                  </a>
                </p>
              )}
              {pedido.mensagem && (
                <p className="border-l-2 border-[var(--color-linha)] pl-[12px] text-[14px] italic leading-[1.5] text-[var(--color-text-secondary)]">
                  “{pedido.mensagem}”
                </p>
              )}
              <div>
                <p className="mb-[8px] text-[13px] font-semibold">Escolher horário</p>
                <div className="flex flex-col gap-[8px] sm:flex-row sm:flex-wrap">
                {pedido.disponibilidades_selecionadas.map((d) => {
                  const label = `${d.horarios?.dia_semana}, ${d.horarios?.hora_inicio.slice(0, 5)}–${d.horarios?.hora_fim.slice(0, 5)}`
                  return (
                    <form key={d.horario_id} action={confirmarHorario}>
                      <input type="hidden" name="matriculaId" value={pedido.id} />
                      <input type="hidden" name="horarioId" value={d.horario_id} />
                      <SubmitButton
                        textoAGuardar="A confirmar..."
                        className="min-h-[48px] w-full rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] px-[16px] text-[14px] font-semibold transition-colors hover:bg-[var(--color-ink)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary-mid)] disabled:opacity-50 sm:w-auto"
                      >
                        Confirmar {label}
                      </SubmitButton>
                    </form>
                  )
                })}
                </div>
              </div>
              <div className="border-t border-[var(--color-linha)] pt-[12px]">
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
