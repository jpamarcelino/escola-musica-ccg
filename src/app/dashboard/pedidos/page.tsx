import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth-context'
import { confirmarHorario, recusarPedido } from '@/lib/actions/professor'
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
  const { supabase, user } = await getAuthContext()

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

  function idadePedido(criadoEm: string) {
    const dias = Math.max(0, Math.floor((agoraNaEscola().getTime() - new Date(criadoEm).getTime()) / 86_400_000))
    return dias === 0 ? 'Hoje' : dias === 1 ? 'Há 1 dia' : `Há ${dias} dias`
  }

  return (
    <main id="conteudo-principal" className="partitura-pagina pedidos-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">←</Link>
          <div><p className="partitura-sobretitulo">Fila de decisão</p><h1>Pedidos</h1><p>{pedidos.length > 0 ? `${pedidos.length} ${pedidos.length === 1 ? 'pedido aguarda' : 'pedidos aguardam'} resposta.` : 'Está tudo em dia.'}</p></div>
        </header>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}
        {guardado && <MensagemInfo>{decodeURIComponent(guardado)}</MensagemInfo>}

        <section className="pedidos-fila" aria-label="Pedidos pendentes">
          {pedidos.length === 0 && (
            <EmptyState
              titulo="Não há pedidos pendentes"
              descricao="Está tudo em dia — os novos pedidos de aula aparecem aqui."
            />
          )}
          {pedidos.map((pedido, indice) => (
            <article key={pedido.id} className="pedido-registo">
              <header>
                <span className="pedido-indice">{String(indice + 1).padStart(2, '0')}</span>
                <div><h2>{pedido.alunos?.nome}</h2><p>{pedido.instrumentos?.nome}</p></div>
                <time dateTime={pedido.criado_em}>{idadePedido(pedido.criado_em)}</time>
              </header>
              {pedido.alunos?.encarregado?.telefone && (
                <p className="pedido-contacto">
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
                <blockquote>
                  “{pedido.mensagem}”
                </blockquote>
              )}
              <div className="pedido-disponibilidade">
                <p>Disponibilidade indicada</p>
                <div>
                {pedido.disponibilidades_selecionadas.map((d) => {
                  const label = `${d.horarios?.dia_semana}, ${d.horarios?.hora_inicio.slice(0, 5)}–${d.horarios?.hora_fim.slice(0, 5)}`
                  return (
                    <form key={d.horario_id} action={confirmarHorario}>
                      <input type="hidden" name="matriculaId" value={pedido.id} />
                      <input type="hidden" name="horarioId" value={d.horario_id} />
                      <SubmitButton
                        textoAGuardar="A confirmar..."
                        className="pedido-horario-botao"
                      >
                        Confirmar {label}
                      </SubmitButton>
                    </form>
                  )
                })}
                </div>
              </div>
              <footer>
                <BotaoAcaoDestruir
                  label="Recusar"
                  variante="editorial"
                  mensagem={`Recusar o pedido de ${pedido.alunos?.nome} (${pedido.instrumentos?.nome})? O pedido será apagado.`}
                  action={recusarPedido}
                >
                  <input type="hidden" name="matriculaId" value={pedido.id} />
                </BotaoAcaoDestruir>
              </footer>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
