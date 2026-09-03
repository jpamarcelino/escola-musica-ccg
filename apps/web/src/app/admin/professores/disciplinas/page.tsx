import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { aceitarDisciplina, recusarDisciplina } from '@/lib/actions/admin'
import { SubmitButton } from '@/components/submit-button'
import { classesCampo } from '@/components/campo-formulario'
import { MensagemErro } from '@/components/mensagem'
import { EmptyState } from '@/components/empty-state'
import { formatarDataEscolar } from '@ccg/core'
import { VoltarAtras } from '@/components/voltar-atras'

type Pedido = {
  id: number
  estado: string
  mensagem: string | null
  resposta: string | null
  criado_em: string
  professor: { nome: string } | null
  instrumentos: { nome: string; programa: string } | null
}

// Quem pediu para ensinar o quê.
//
// Existe porque as disciplinas de um professor deixaram de ser escolha
// dele (migração 0040): marcava as caixas que quisesse e a secretaria só
// dava por isso quando aparecesse um aluno na lista. Agora pede, e é
// aqui que se responde.
export default async function DisciplinasPage({
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

  const { data: perfil } = await supabase
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.admin) {
    redirect('/dashboard')
  }

  const { data } = await supabase
    .from('pedidos_instrumento')
    .select(
      'id, estado, mensagem, resposta, criado_em, professor:profiles!pedidos_instrumento_professor_id_fkey(nome), instrumentos(nome, programa)'
    )
    .order('criado_em', { ascending: false })

  const pedidos = (data ?? []) as unknown as Pedido[]
  const pendentes = pedidos.filter((p) => p.estado === 'pendente')
  const respondidos = pedidos.filter((p) => p.estado !== 'pendente').slice(0, 20)

  return (
    <main id="conteudo-principal" className="partitura-pagina pinterest-admin-professor-disciplinas">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <VoltarAtras destino="/admin/professores" className="partitura-voltar" rotulo="Voltar aos professores">←</VoltarAtras>
          <div>
            <p className="partitura-sobretitulo">Professores</p>
            <h1>Pedidos de disciplina</h1>
            <p>
              {pendentes.length === 0
                ? 'Nenhum pedido à espera de resposta.'
                : `${pendentes.length} ${pendentes.length === 1 ? 'pedido' : 'pedidos'} por responder.`}
            </p>
          </div>
        </header>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}

        <section className="space-y-3 pt-2">
          <h2 className="font-semibold">Por responder</h2>
          {pendentes.length === 0 ? (
            <EmptyState titulo="Nada pendente" />
          ) : (
            <div className="space-y-3">
              {pendentes.map((p) => (
                <div key={p.id} className="lista-item space-y-2">
                  <p className="lista-item-titulo">
                    {p.professor?.nome} quer ensinar {p.instrumentos?.nome}
                  </p>
                  <p className="lista-item-sub">
                    {formatarDataEscolar(p.criado_em.slice(0, 10), {
                      day: 'numeric',
                      month: 'long',
                    })}
                    {p.instrumentos?.programa ? ` · ${p.instrumentos.programa}` : ''}
                  </p>
                  {p.mensagem && (
                    <p className="text-sm italic text-foreground/70">“{p.mensagem}”</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={aceitarDisciplina}>
                      <input type="hidden" name="pedidoId" value={p.id} />
                      <SubmitButton
                        textoAGuardar="A aceitar…"
                        className="flex h-[44px] items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-azul-fundo)] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
                      >
                        Aceitar
                      </SubmitButton>
                    </form>
                    {/* A recusa leva motivo: "não" sem razão obriga o
                        professor a vir perguntar porquê à secretaria. */}
                    <form action={recusarDisciplina} className="flex flex-1 flex-wrap gap-2">
                      <input type="hidden" name="pedidoId" value={p.id} />
                      <label htmlFor={`resposta-${p.id}`} className="sr-only">
                        Motivo
                      </label>
                      <input
                        id={`resposta-${p.id}`}
                        name="resposta"
                        maxLength={500}
                        placeholder="Motivo (opcional)"
                        className={`${classesCampo} flex-1 min-w-[160px]`}
                      />
                      <SubmitButton
                        textoAGuardar="A responder…"
                        className="flex h-[44px] items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] px-5 text-[14px] font-semibold text-[var(--color-ink)] disabled:opacity-50"
                      >
                        Não aceitar
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {respondidos.length > 0 && (
          <section className="space-y-2 border-t border-[var(--color-linha)] pt-6">
            <h2 className="font-semibold">Já respondidos</h2>
            {respondidos.map((p) => (
              <div key={p.id} className="lista-item">
                <p className="lista-item-titulo">
                  {p.professor?.nome} · {p.instrumentos?.nome}
                </p>
                <p className="lista-item-sub">
                  {p.estado === 'aceite' ? 'Aceite' : 'Não aceite'}
                  {p.resposta ? ` · ${p.resposta}` : ''}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
