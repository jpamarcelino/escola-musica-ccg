import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { pedirInstrumento } from '@/lib/actions/professor'
import {
  atualizarNomeConta,
  atualizarNifConta,
  atualizarEmailConta,
  atualizarPasswordConta,
  logout,
} from '@/lib/actions/auth'
import { PageHeader } from '@/components/page-header'
import { Rotulo, classesCampo } from '@/components/campo-formulario'
import { AtivarNotificacoes } from '@/components/ativar-notificacoes'
import { SeletorAparencia } from '@/components/seletor-aparencia'
import { SubmitButton } from '@/components/submit-button'
import {
  EditarNomeForm,
  EditarNifForm,
  EditarEmailForm,
  AlterarPasswordForm,
} from '@/components/conta-forms'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { ehContaCCG } from '@/lib/navegacao'
import Link from 'next/link'
import { DOCUMENTOS, CCG } from '@/lib/legal'

export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ erroHorarios?: string; erro?: string }>
}) {
  const { erroHorarios, erro } = await searchParams

  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
  }

  const { data: profileRowData } = await supabase
    .from('profiles')
    .select('nome, nif, foto_url, perfis_escola(tipo, programa, admin)')
    .eq('id', user.id)
    .single()

  const profileRow = profileRowData as {
    nome: string
    nif: string | null
    foto_url: string | null
    perfis_escola: {
      tipo: string
      programa: string | null
      admin: boolean
    } | null
  } | null

  const profile = profileRow
    ? {
        nome: profileRow.nome,
        nif: profileRow.nif,
        foto_url: profileRow.foto_url,
        tipo: profileRow.perfis_escola?.tipo,
        programa: profileRow.perfis_escola?.programa,
        admin: profileRow.perfis_escola?.admin ?? false,
      }
    : null

  if (profile?.tipo === 'admin') {
    redirect('/admin/conta')
  }
  // O "!profile" explícito não é redundante: sem ele o TypeScript deixa
  // de conseguir garantir que "profile" existe daqui para baixo, porque a
  // verificação do tipo passou a estar dentro de uma função.
  if (!profile || (profile.tipo !== 'professor' && !ehContaCCG(profile.tipo))) {
    redirect('/dashboard')
  }
  const ehProfessor = profile.tipo === 'professor'

  const instrumentosQuery = ehProfessor
    ? supabase
        .from('instrumentos')
        .select('id, nome')
        .eq('programa', profile.programa)
        .order('nome')
    : Promise.resolve({ data: [] })

  const meusInstrumentosQuery = ehProfessor
    ? supabase
        .from('professor_instrumentos')
        .select('especialidade, instrumentos(id, nome)')
        .eq('professor_id', user.id)
    : Promise.resolve({ data: [] })

  // As duas consultas do professor são independentes uma da outra: em
  // paralelo, a página paga a latência da mais lenta em vez da soma.
  const [{ data: instrumentosData }, { data: meusInstrumentosData }] = await Promise.all([
    instrumentosQuery,
    meusInstrumentosQuery,
  ])

  const todosInstrumentos = instrumentosData ?? []

  const meusInstrumentos = (
    (meusInstrumentosData ?? []) as unknown as {
      especialidade: string | null
      instrumentos: { id: number; nome: string } | null
    }[]
  )
    .filter((r) => r.instrumentos !== null)
    .map((r) => ({ ...r.instrumentos!, especialidade: r.especialidade }))

  // Os pedidos que já fez, e o que lhe falta pedir. Uma disciplina com
  // pedido pendente sai da lista de escolha: pedir duas vezes a mesma
  // coisa não a aproxima de ser aceite.
  const { data: pedidosData } = ehProfessor
    ? await supabase
        .from('pedidos_instrumento')
        .select('id, estado, resposta, instrumento_id, instrumentos(nome)')
        .eq('professor_id', user.id)
        .order('criado_em', { ascending: false })
    : { data: null }

  const pedidos = (pedidosData ?? []) as unknown as {
    id: number
    estado: string
    resposta: string | null
    instrumento_id: number
    instrumentos: { nome: string } | null
  }[]

  const jaTenho = new Set(meusInstrumentos.map((i) => i.id))
  const jaPedi = new Set(pedidos.filter((p) => p.estado === 'pendente').map((p) => p.instrumento_id))
  const porPedir = todosInstrumentos.filter((i) => !jaTenho.has(i.id) && !jaPedi.has(i.id))

  // Os aparelhos desta conta que já têm notificações ligadas. Vai só
  // como lista de endpoints: é o que o componente precisa para saber se
  // ESTE aparelho já está ligado, e não há motivo para mandar as chaves
  // de cada um para o browser.
  const { data: subscricoesData } = await supabase
    .from('push_subscricoes')
    .select('endpoint')
    .eq('user_id', user.id)
  const endpoints = (subscricoesData ?? []).map((s) => s.endpoint)
  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard" titulo="Conta" />

        {(erroHorarios || erro) && (
          <p className="rounded border border-red-600/30 p-3 text-sm text-red-600">
            {erroHorarios || erro}
          </p>
        )}

        <section className="space-y-4">
          <h2 className="font-semibold">Dados</h2>
          <EditarNomeForm action={atualizarNomeConta} nomeAtual={profile.nome} />
          <EditarNifForm action={atualizarNifConta} nifAtual={profile.nif ?? ''} />
          {!ehProfessor && (
            <EditarEmailForm action={atualizarEmailConta} emailAtual={user.email ?? ''} />
          )}
          {ehProfessor && (
            <p className="text-sm">
              <span className="text-foreground/60">Email: </span>
              {user.email}
            </p>
          )}
        </section>

        {profile.admin && (
          <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
            <h2 className="font-semibold">Administração</h2>
            {/* O único caminho para /admin a partir do painel de quem dá
                aulas. Administrar é uma marca no perfil e não um tipo: um
                professor pode ser administrador, e para esses o painel da
                escola existia sem ter porta — só lá chegava quem soubesse
                escrever o endereço à mão. */}
            <p className="text-sm text-foreground/60">
              Tens acesso à gestão da escola: alunos, professores, mensalidades e
              recomendações.
            </p>
            <LigacaoTerciaria href="/admin">Ir para o painel da escola</LigacaoTerciaria>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold">Alterar password</h2>
          <AlterarPasswordForm action={atualizarPasswordConta} />
        </section>

        {ehProfessor && (
          <>
            <section className="space-y-3">
              <h2 className="font-semibold">Disciplinas que ensinas</h2>
              {meusInstrumentos.length === 0 ? (
                <p className="text-sm text-foreground/60">
                  Ainda não tens nenhuma disciplina atribuída.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {meusInstrumentos.map((i) => (
                    <li key={i.id}>
                      <strong className="font-medium">{i.nome}</strong>
                      {i.especialidade ? ` · ${i.especialidade}` : ''}
                    </li>
                  ))}
                </ul>
              )}
              {/* Deixou de ser uma lista de caixas que o professor
                  gravava: quem ensinava guitarra acrescentava canto num
                  clique. Tirar também não é dele — uma disciplina pode
                  ter alunos inscritos, e a matrícula não pode ficar sem
                  o professor que a dá. */}
              <p className="text-xs text-foreground/50">
                Para deixar de dar uma destas, fala com a secretaria.
              </p>

              {porPedir.length > 0 && (
                <form action={pedirInstrumento} className="space-y-3 pt-2">
                  <div className="space-y-[6px]">
                    <Rotulo htmlFor="instrumentoId">Pedir para ensinar</Rotulo>
                    <select
                      id="instrumentoId"
                      name="instrumentoId"
                      required
                      defaultValue=""
                      className={classesCampo}
                    >
                      <option value="" disabled>
                        Escolhe uma disciplina
                      </option>
                      {porPedir.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-[6px]">
                    <Rotulo htmlFor="mensagem-disciplina">
                      Mensagem para a secretaria (opcional)
                    </Rotulo>
                    <textarea
                      id="mensagem-disciplina"
                      name="mensagem"
                      rows={2}
                      maxLength={500}
                      className={classesCampo}
                    />
                  </div>
                  <SubmitButton
                    textoAGuardar="A enviar…"
                    className="flex h-[52px] w-full items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-raised)] disabled:opacity-50 motion-reduce:transition-none sm:w-auto sm:px-7"
                  >
                    Enviar pedido
                  </SubmitButton>
                </form>
              )}

              {pedidos.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-[13px] font-semibold">Pedidos</h3>
                  {pedidos.map((p) => (
                    <div key={p.id} className="lista-item">
                      <p className="lista-item-titulo">{p.instrumentos?.nome}</p>
                      <p className="lista-item-sub">
                        {p.estado === 'pendente'
                          ? 'À espera da resposta da secretaria.'
                          : p.estado === 'aceite'
                            ? 'Aceite.'
                            : `Não aceite.${p.resposta ? ` ${p.resposta}` : ''}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* As notificações são da CONTA, não do papel: quem é
            professor e da secretaria ao mesmo tempo liga uma vez e
            recebe tudo. Por isso esta secção está fora do bloco de
            professor. */}
        <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
          <h2 className="font-semibold">Aparência</h2>
          <SeletorAparencia />
        </section>

        <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
          <h2 className="font-semibold">Notificações no telemóvel</h2>
          {chavePublica ? (
            <AtivarNotificacoes chavePublica={chavePublica} endpointsGuardados={endpoints} />
          ) : (
            <p className="text-sm text-foreground/60">
              As notificações ainda não estão configuradas nesta instalação.
            </p>
          )}
        </section>

        <section className="border-t border-[var(--color-linha)] pt-6">
          <form action={logout}>
            <LigacaoTerciaria>Sair da conta</LigacaoTerciaria>
          </form>
        </section>

        {/* As mesmas ligações do rodapé público, aqui dentro. Quem já
            entrou não passa pelo rodapé das páginas de entrada, e tem de
            continuar a chegar aos documentos — e ao contacto para
            exercer direitos — sem sair da app. */}
        <section className="conta-legal space-y-2 border-t border-[var(--color-linha)] pt-6">
          <h2 className="font-semibold">Privacidade e informação legal</h2>
          <ul>
            {DOCUMENTOS.map((d) => (
              <li key={d.tipo}>
                <Link href={d.caminho}>{d.titulo}</Link>
              </li>
            ))}
          </ul>
          <p className="conta-legal-nota">
            Para exercer direitos sobre os teus dados — acesso, retificação, apagamento,
            oposição, portabilidade — escreve para{' '}
            <a href={`mailto:${CCG.email}`}>{CCG.email}</a>. O encerramento da conta faz-se na
            página abaixo.
          </p>
        </section>

        {/* Cancelar matrículas, passar alunos para outra conta e apagar a
            conta mudaram-se para uma página à parte: são raras, não se
            desfazem, e ao lado do nome e da password liam-se como mais um
            campo a preencher. */}
        <section className="space-y-2 border-t border-[var(--color-linha)] pt-6">
          <LigacaoTerciaria href="/dashboard/conta/avancado">
            Cancelamentos e transferências
          </LigacaoTerciaria>
        </section>
      </div>
    </main>
  )
}
