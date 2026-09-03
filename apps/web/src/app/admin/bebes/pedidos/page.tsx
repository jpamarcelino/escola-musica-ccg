import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VoltarAtras } from '@/components/voltar-atras'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { SubmitButton } from '@/components/submit-button'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { EmptyState } from '@/components/empty-state'
import { classesCampo } from '@/components/campo-formulario'
import { formatarHora } from '@ccg/core'
import { aceitarPedidoBebes, recusarPedidoBebes } from '@/lib/actions/bebes'
import { ehSecretaria, papelDoAdmin } from '@/lib/permissoes'
import { Baby, ChevronLeft, ClipboardCheck, Phone, Users } from 'lucide-react'

type Pedido = {
  id: number
  criado_em: string
  mensagem: string | null
  instrumento_id: number
  alunos: {
    nome: string
    data_nascimento: string | null
    encarregado: { nome: string | null; telefone: string | null } | null
  } | null
  instrumentos: { nome: string } | null
}

export default async function AdminBebesPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; guardado?: string }>
}) {
  const { erro, guardado } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const papel = await papelDoAdmin(supabase, user.id)

  if (!papel.admin) redirect('/dashboard')

  // A lista de quem está à espera é para todos verem. Aceitar e recusar
  // é da secretaria — é o que inscreve uma criança e cria a mensalidade.
  const podeMexer = ehSecretaria(papel)

  const { data: turmasData } = await supabase
    .from('turmas_bebes')
    .select('id, instrumento_id, dia_semana, hora_inicio, hora_fim, capacidade, instrumentos(nome)')
    .order('hora_inicio')
  const turmas = (turmasData ?? []) as unknown as {
    id: number
    instrumento_id: number
    dia_semana: string
    hora_inicio: string
    hora_fim: string
    capacidade: number
    instrumentos: { nome: string } | null
  }[]
  const ids = turmas.map((t) => t.instrumento_id)

  const [{ data: pedidosData }, { data: atribuidos }] = await Promise.all([
    ids.length
      ? supabase
          .from('matriculas')
          .select(
            'id, criado_em, mensagem, instrumento_id, alunos(nome, data_nascimento, encarregado:profiles!alunos_encarregado_id_fkey(nome, telefone)), instrumentos(nome)'
          )
          .eq('estado', 'a_escolher')
          .in('instrumento_id', ids)
          .order('criado_em')
      : Promise.resolve({ data: [] }),
    supabase.from('turmas_bebes_professores').select('turma_id, professor_id, profiles(nome)'),
  ])
  const pedidos = (pedidosData ?? []) as unknown as Pedido[]

  const profsPorTurma = new Map<number, { id: string; nome: string }[]>()
  for (const a of (atribuidos ?? []) as unknown as {
    turma_id: number
    professor_id: string
    profiles: { nome: string } | null
  }[]) {
    const lista = profsPorTurma.get(a.turma_id) ?? []
    lista.push({ id: a.professor_id, nome: a.profiles?.nome ?? 'Sem nome' })
    profsPorTurma.set(a.turma_id, lista)
  }

  const ocupacoes = new Map<number, number>()
  for (const t of turmas) {
    const { data } = await supabase.rpc('ocupacao_turma_bebes', { p_turma_id: t.id })
    ocupacoes.set(t.id, Number(data ?? 0))
  }

  return (
    <main id="conteudo-principal" className="admin-bebes admin-bebes-pedidos">
      <div className="admin-bebes-folha">
        <header className="admin-bebes-cabecalho">
          <VoltarAtras destino="/admin/bebes" className="admin-bebes-voltar" rotulo="Voltar à escola de bebés"><ChevronLeft size={22} /></VoltarAtras>
          <div><h1>Inscrições</h1><p>
              {pedidos.length > 0
                ? `${pedidos.length} ${pedidos.length === 1 ? 'pedido aguarda' : 'pedidos aguardam'} resposta.`
                : 'Está tudo em dia.'}
            </p></div>
          <span className="admin-bebes-marca"><ClipboardCheck size={22} /></span>
        </header>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}
        {guardado && <MensagemInfo>{decodeURIComponent(guardado)}</MensagemInfo>}

        {/* O estado das turmas antes dos pedidos: aceitar um pedido para
            uma turma cheia não é possível, e é melhor sabê-lo antes de
            abrir o formulário do que ao levar com o erro. */}
        <section className="admin-bebes-estado-turmas">
          <header><Users size={18} /><div><h2>Estado das turmas</h2><p>Confirma se há lugar e professor antes de aceitar.</p></div></header>
          <div>
            {turmas.map((t) => {
              const inscritos = ocupacoes.get(t.id) ?? 0
              const profs = profsPorTurma.get(t.id) ?? []
              return (
                <div key={t.id} className="admin-bebes-estado-turma">
                  <span>
                    <strong>{t.instrumentos?.nome}</strong>
                    <small>
                      {t.dia_semana}, {formatarHora(t.hora_inicio)}–{formatarHora(t.hora_fim)}
                      {profs.length === 0 ? ' · sem professor' : ` · ${profs.map((p) => p.nome).join(', ')}`}
                    </small>
                  </span>
                  <b className={inscritos >= t.capacidade ? 'esta-cheia' : ''}>
                      {inscritos}/{t.capacidade}
                      {inscritos >= t.capacidade ? ' · cheia' : ''}
                  </b>
                </div>
              )
            })}
          </div>
        </section>

        <section className="admin-bebes-fila" aria-label="Pedidos por responder">
          {pedidos.length === 0 && (
            <EmptyState
              titulo="Não há pedidos pendentes"
              descricao="Os pedidos de inscrição em Música para Bebés aparecem aqui."
            />
          )}
          {pedidos.map((pedido) => {
            const turma = turmas.find((t) => t.instrumento_id === pedido.instrumento_id)
            const profs = turma ? profsPorTurma.get(turma.id) ?? [] : []
            const inscritos = turma ? ocupacoes.get(turma.id) ?? 0 : 0
            const cheia = turma ? inscritos >= turma.capacidade : false
            return (
              <article key={pedido.id} className="admin-bebes-pedido">
                <header>
                  <span className="admin-bebes-pedido-inicial"><Baby size={19} /></span>
                  <div>
                    <h2>{pedido.alunos?.nome}</h2>
                    <p>{pedido.instrumentos?.nome}</p>
                  </div>
                </header>

                {pedido.alunos?.encarregado?.telefone && (
                  <p className="admin-bebes-contacto">
                    <a
                      href={`tel:${pedido.alunos.encarregado.telefone}`}
                      className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-4"
                    >
                      <Phone size={16} /> Ligar para {pedido.alunos.encarregado.nome ?? 'o encarregado'}
                      {' — '}
                      {pedido.alunos.encarregado.telefone}
                    </a>
                  </p>
                )}

                {pedido.mensagem && <blockquote>“{pedido.mensagem}”</blockquote>}

                {profs.length === 0 ? (
                  <div className="admin-bebes-indisponivel">
                    <p>Sem professor na turma</p>
                    <p>
                      Atribui um professor a esta turma em “Horários e professores” antes de
                      aceitar. Sem professor não há horário onde inscrever o aluno.
                    </p>
                  </div>
                ) : cheia ? (
                  <div className="admin-bebes-indisponivel">
                    <p>Turma cheia</p>
                    <p>
                      {turma?.instrumentos?.nome} tem {inscritos} de {turma?.capacidade} lugares
                      ocupados. Para aceitar mais alguém, aumenta a capacidade da turma primeiro.
                    </p>
                  </div>
                ) : !podeMexer ? null : (
                  <form action={aceitarPedidoBebes} className="admin-bebes-aceitar">
                    <input type="hidden" name="matriculaId" value={pedido.id} />
                    <label className="block text-[12.5px] font-medium" style={{ color: 'var(--color-tinta-suave)' }}>
                      Professor da turma
                    </label>
                    <select name="professorId" required defaultValue={profs.length === 1 ? profs[0].id : ''} className={classesCampo}>
                      {profs.length > 1 && <option value="" disabled>Escolhe</option>}
                      {profs.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <label className="block text-[12.5px] font-medium" style={{ color: 'var(--color-tinta-suave)' }}>
                      Mensalidade
                    </label>
                    {/* 36 € é o valor da escola, como na Dança. Fica
                        pré-preenchido e editável: o preço de tabela poupa
                        escrever, sem impedir uma excepção. */}
                    <input
                      type="text"
                      inputMode="decimal"
                      name="valorMensal"
                      defaultValue="36"
                      className={classesCampo}
                    />
                    <SubmitButton textoAGuardar="A inscrever…" className="pedido-horario-botao">
                      Aceitar inscrição
                    </SubmitButton>
                  </form>
                )}

                {podeMexer && (
                <footer>
                  <BotaoAcaoDestruir
                    label="Recusar"
                    variante="editorial"
                    titulo="Recusar este pedido?"
                    mensagem={`O pedido de ${pedido.alunos?.nome} em ${pedido.instrumentos?.nome} é apagado e a família é avisada. Não há como o recuperar.`}
                    action={recusarPedidoBebes}
                  >
                    <input type="hidden" name="matriculaId" value={pedido.id} />
                  </BotaoAcaoDestruir>
                </footer>
                )}
              </article>
            )
          })}
        </section>
      </div>
    </main>
  )
}
