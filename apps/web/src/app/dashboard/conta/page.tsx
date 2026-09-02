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
import { ehContaCCG } from '@/lib/navegacao'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
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
    <main id="conteudo-principal" className="pinterest-conta">
      <div className="pinterest-conta-folha">
        <header className="pinterest-conta-cabecalho">
          <Link href="/dashboard" className="pinterest-conta-voltar" aria-label="Voltar">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
          <div>
            <h1>Conta</h1>
            <p>Os teus dados e as definições da aplicação.</p>
          </div>
        </header>

        {(erroHorarios || erro) && <p className="pinterest-conta-erro">{erroHorarios || erro}</p>}

        {/* Quem está autenticado, à cabeça e sem nada para carregar: numa
            página de definições, a primeira pergunta é sempre "esta conta
            é a minha?". */}
        <div className="pinterest-conta-identidade">
          <span aria-hidden="true">{profile.nome.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{profile.nome}</strong>
            <small>{user.email}</small>
            <span className="pinterest-conta-papel">
              {ehProfessor ? 'Professor' : 'Conta CCG'}
              {profile.admin ? ' · Secretaria' : ''}
            </span>
          </div>
        </div>

        <section className="pinterest-conta-seccao">
          <h2>Dados</h2>
          <div className="pinterest-conta-cartao">
            <EditarNomeForm action={atualizarNomeConta} nomeAtual={profile.nome} />
            <EditarNifForm action={atualizarNifConta} nifAtual={profile.nif ?? ''} />
            {!ehProfessor && (
              <EditarEmailForm action={atualizarEmailConta} emailAtual={user.email ?? ''} />
            )}
          </div>
          {ehProfessor && (
            <p className="pinterest-conta-nota">
              O email desta conta é {user.email}. Para o mudar, fala com a secretaria.
            </p>
          )}
        </section>

        {profile.admin && (
          <section className="pinterest-conta-seccao">
            <h2>Administração</h2>
            {/* O único caminho para /admin a partir do painel de quem dá
                aulas. Administrar é uma marca no perfil e não um tipo: um
                professor pode ser administrador, e para esses o painel da
                escola existia sem ter porta — só lá chegava quem soubesse
                escrever o endereço à mão. */}
            <div className="pinterest-conta-lista">
              <Link href="/admin">
                <span>Ir para o painel da escola</span>
                <span aria-hidden="true">
                  <ChevronRight size={18} strokeWidth={2} />
                </span>
              </Link>
            </div>
            <p className="pinterest-conta-nota">
              Tens acesso à gestão da escola: alunos, professores, mensalidades e recomendações.
            </p>
          </section>
        )}

        <section className="pinterest-conta-seccao">
          <h2>Password</h2>
          <div className="pinterest-conta-cartao">
            <AlterarPasswordForm action={atualizarPasswordConta} />
          </div>
        </section>

        {ehProfessor && (
          <>
            <section className="pinterest-conta-seccao">
              <h2>Disciplinas que ensinas</h2>
              {meusInstrumentos.length === 0 ? (
                <p className="pinterest-conta-nota">
                  Ainda não tens nenhuma disciplina atribuída.
                </p>
              ) : (
                <ul className="pinterest-conta-cartao pinterest-conta-disciplinas">
                  {meusInstrumentos.map((i) => (
                    <li key={i.id}>
                      {i.nome}
                      {i.especialidade ? <span> · {i.especialidade}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
              {/* Deixou de ser uma lista de caixas que o professor
                  gravava: quem ensinava guitarra acrescentava canto num
                  clique. Tirar também não é dele — uma disciplina pode
                  ter alunos inscritos, e a matrícula não pode ficar sem
                  o professor que a dá. */}
              <p className="pinterest-conta-nota">
                Para deixar de dar uma destas, fala com a secretaria.
              </p>

              {porPedir.length > 0 && (
                <form action={pedirInstrumento} className="pinterest-conta-cartao space-y-3">
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
                <div className="space-y-2 pt-3">
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
        <section className="pinterest-conta-seccao">
          <h2>Aparência</h2>
          <div className="pinterest-conta-cartao">
            <SeletorAparencia />
          </div>
        </section>

        <section className="pinterest-conta-seccao">
          <h2>Notificações</h2>
          <div className="pinterest-conta-cartao">
            {chavePublica ? (
              <AtivarNotificacoes chavePublica={chavePublica} endpointsGuardados={endpoints} />
            ) : (
              <p className="pinterest-conta-nota" style={{ margin: 0 }}>
                As notificações ainda não estão configuradas nesta instalação.
              </p>
            )}
          </div>
        </section>

        {/* As mesmas ligações do rodapé público, aqui dentro. Quem já
            entrou não passa pelo rodapé das páginas de entrada, e tem de
            continuar a chegar aos documentos — e ao contacto para
            exercer direitos — sem sair da app. */}
        <section className="pinterest-conta-seccao">
          <h2>Privacidade e informação legal</h2>
          <div className="pinterest-conta-lista">
            {DOCUMENTOS.map((d) => (
              <Link key={d.tipo} href={d.caminho}>
                <span>{d.titulo}</span>
                <span aria-hidden="true">
                  <ChevronRight size={18} strokeWidth={2} />
                </span>
              </Link>
            ))}
          </div>
          <p className="pinterest-conta-nota">
            Para exercer direitos sobre os teus dados — acesso, retificação, apagamento,
            oposição, portabilidade — escreve para{' '}
            <a href={`mailto:${CCG.email}`}>{CCG.email}</a>.
          </p>
        </section>

        {/* Cancelar matrículas, passar alunos para outra conta e apagar a
            conta mudaram-se para uma página à parte: são raras, não se
            desfazem, e ao lado do nome e da password liam-se como mais um
            campo a preencher. Sair fica na mesma lista, no fim de tudo —
            é o último sítio onde se toca por engano. */}
        <section className="pinterest-conta-seccao">
          <h2>Conta</h2>
          {/* Os dois com o mesmo peso: são as duas saídas desta página, e
              uma delas a parecer uma ligação e a outra um botão dizia que
              uma era mais importante do que a outra. Não é. */}
          <div className="pinterest-conta-botoes">
            <Link href="/dashboard/conta/avancado">
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
              Cancelamentos e transferências
            </Link>
            <form action={logout}>
              <button type="submit">
                <LogOut size={17} strokeWidth={2} aria-hidden="true" />
                Sair da conta
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
