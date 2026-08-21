import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { apagarConta, apagarContaSuperAdmin } from '@/lib/actions/auth'
import { criarConviteMigracaoAluno, resgatarConvite } from '@/lib/actions/convites'
import { arquivarAluno, cancelarMatricula } from '@/lib/actions/aluno'
import { PageHeader } from '@/components/page-header'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { ApagarContaSuperAdminForm } from '@/components/apagar-conta-super-admin-form'
import { EmptyState } from '@/components/empty-state'
import { GerarLinkMigracaoForm, ReceberAlunoForm } from '@/components/convite-forms'
import { MensagemErro } from '@/components/mensagem'
import { ehContaCCG } from '@/lib/navegacao'
import { TEXTOS_LEGAIS } from '@ccg/core'

// As ações da conta que não se desfazem, uma página a seguir à Conta.
//
// O que as junta é serem todas saídas: terminar uma disciplina, passar um
// aluno para outra conta, sair da escola de vez. Nenhuma delas se usa mais
// do que uma ou duas vezes na vida de uma conta, e todas custam caro se
// forem tocadas por engano.
//
// Estavam todas misturadas com o nome, o email e a password — coisas que
// se mudam sem medo. Em particular, a caixa do código de convite abria a
// Conta com a pergunta "Tens um código de convite?", que quem nunca
// recebeu nenhum lia como um passo que lhe faltava dar. Não é: passar um
// perfil de aluno para outra conta é raro e deliberado, e o mesmo se
// aplica a apagar a conta.
//
// Ficam aqui juntas de propósito. Uma pessoa que chegue a esta página
// veio à procura de uma delas, e é bom que veja as consequências das
// outras pelo caminho.
export default async function ContaAvancadoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams

  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
  }

  const { data: profileRowData } = await supabase
    .from('profiles')
    .select('nome, perfis_escola(tipo, admin, super_admin)')
    .eq('id', user.id)
    .single()

  const profileRow = profileRowData as {
    nome: string
    perfis_escola: { tipo: string; admin: boolean; super_admin: boolean } | null
  } | null

  const tipo = profileRow?.perfis_escola?.tipo
  const superAdmin = profileRow?.perfis_escola?.super_admin ?? false

  // A administração tem a sua própria conta (/admin/conta), com as mesmas
  // ações — mandar um admin para aqui dava-lhe uma segunda porta para o
  // mesmo sítio, com uma barra de navegação que não é a dele.
  if (tipo === 'admin') {
    redirect('/admin/conta')
  }
  if (tipo !== 'professor' && !ehContaCCG(tipo)) {
    redirect('/dashboard')
  }
  const ehProfessor = tipo === 'professor'

  // Um professor não gere perfis de aluno — para ele esta página é só a
  // eliminação da conta, e as duas consultas seguintes não têm resposta
  // possível.
  const { data: outrosAdminsData } = superAdmin
    ? await supabase
        .from('perfis_escola')
        .select('id, profiles(nome)')
        .eq('admin', true)
        .neq('id', user.id)
    : { data: [] }

  const { data: meusAlunosData } = !ehProfessor
    ? await supabase
        .from('alunos')
        .select('id, nome, propria_conta_id')
        .eq('encarregado_id', user.id)
        .order('criado_em')
    : { data: [] }

  // As aulas a decorrer, de todos os alunos da conta. O filtro passa pelo
  // join a "alunos" (!inner) em vez de uma segunda consulta com a lista de
  // ids — é o mesmo padrão da Home.
  const { data: matriculasData } = !ehProfessor
    ? await supabase
        .from('matriculas')
        .select(
          'id, aluno_id, alunos!inner(nome, encarregado_id), instrumentos(nome), profiles!matriculas_professor_id_fkey(nome)'
        )
        .eq('alunos.encarregado_id', user.id)
        .eq('estado', 'confirmado')
    : { data: [] }

  const outrosAdmins = (
    (outrosAdminsData ?? []) as unknown as { id: string; profiles: { nome: string } | null }[]
  ).map((p) => ({ id: p.id, nome: p.profiles?.nome ?? '' }))

  const meusAlunos = meusAlunosData ?? []

  const matriculas = (matriculasData ?? []) as unknown as {
    id: number
    aluno_id: string
    alunos: { nome: string } | null
    instrumentos: { nome: string } | null
    profiles: { nome: string } | null
  }[]

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader
          voltar="/dashboard/conta"
          titulo="Cancelamentos e transferências"
          subtitulo="Ações que não se desfazem."
        />

        {erro && <MensagemErro>{erro}</MensagemErro>}

        {!ehProfessor && (
          <>
            <section className="space-y-4">
              <h2 className="font-semibold">Cancelar uma matrícula</h2>
              {/* Estava escondido na agenda do aluno, debaixo do horário
                  de cada aula — um sítio para consultar, não para desfazer
                  uma inscrição. */}
              <p className="text-sm text-foreground/60">
                Termina as aulas de uma disciplina. O aluno mantém-se na tua conta.
              </p>
              {matriculas.length === 0 ? (
                <EmptyState titulo="Nenhuma aula a decorrer" />
              ) : (
                <div className="space-y-3">
                  {matriculas.map((m) => (
                    <div key={m.id} className="lista-item space-y-2">
                      <p className="lista-item-titulo">
                        {m.instrumentos?.nome} · {m.alunos?.nome}
                      </p>
                      <p className="lista-item-sub">com {m.profiles?.nome}</p>
                      <BotaoAcaoDestruir
                        label="Cancelar matrícula"
                        titulo="Cancelar esta matrícula?"
                        variante="editorial"
                        // Uma frase para o que acontece, outra para o
                        // que custa dinheiro. O resto — avisos, arquivo,
                        // histórico — é funcionamento interno da escola:
                        // não muda a decisão de quem está a carregar no
                        // botão, e enche de texto o momento em que ela é
                        // tomada.
                        mensagem={`Terminam as aulas de ${m.instrumentos?.nome} de ${m.alunos?.nome}, com ${m.profiles?.nome}.\n\nA mensalidade deste mês é cobrada na mesma.`}
                        action={cancelarMatricula}
                      >
                        <input type="hidden" name="matriculaId" value={m.id} />
                      </BotaoAcaoDestruir>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 border-t border-[var(--color-linha)] pt-6">
              <h2 className="font-semibold">Passar um aluno para outra conta</h2>
              {/* O caso real: um aluno cresce e passa a querer gerir as
                  suas próprias aulas. O link entrega o perfil inteiro —
                  aulas, presenças, mensalidades — à conta que o usar, e
                  esta deixa de o ver. */}
              <p className="text-sm text-foreground/60">
                Gera um link e envia-o a quem vai passar a gerir esse aluno. Quando essa pessoa o
                usar, o perfil sai da tua conta com todo o histórico.
              </p>
              {meusAlunos.length === 0 ? (
                <EmptyState titulo="Nenhum perfil de aluno" />
              ) : (
                <div className="space-y-3">
                  {meusAlunos.map((a) => (
                    <div key={a.id} className="lista-item space-y-2">
                      <p className="lista-item-titulo">{a.nome}</p>
                      {a.propria_conta_id === user.id ? (
                        <p className="lista-item-sub">
                          Este perfil és tu — não há para onde o passar.
                        </p>
                      ) : (
                        <GerarLinkMigracaoForm action={criarConviteMigracaoAluno} alunoId={a.id} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 border-t border-[var(--color-linha)] pt-6">
              <h2 className="font-semibold">Eliminar um perfil de aluno</h2>
              {/* "Eliminar" é o que a pessoa pensa que está a fazer, e é
                  por isso que o botão diz isso. O que a app faz é
                  arquivar: por trás de um perfil estão presenças,
                  mensalidades e recomendações com este id, e apagá-lo
                  deixava o histórico da escola com buracos. O aviso do
                  popup explica a diferença que interessa — sai da tua
                  conta, fica no arquivo da escola. */}
              <p className="text-sm text-foreground/60">
                O perfil sai da tua conta. As aulas a decorrer são canceladas.
              </p>
              {meusAlunos.length === 0 ? (
                <EmptyState titulo="Nenhum perfil de aluno" />
              ) : (
                <div className="space-y-3">
                  {meusAlunos.map((a) => {
                    const aulas = matriculas.filter((m) => m.aluno_id === a.id)
                    const disciplinas = aulas
                      .map((m) => m.instrumentos?.nome)
                      .filter((nome): nome is string => Boolean(nome))
                    return (
                      <div key={a.id} className="lista-item space-y-2">
                        <p className="lista-item-titulo">{a.nome}</p>
                        <p className="lista-item-sub">
                          {disciplinas.length === 0
                            ? 'Sem aulas a decorrer'
                            : `${disciplinas.length === 1 ? 'Aula a decorrer' : 'Aulas a decorrer'}: ${disciplinas.join(', ')}`}
                        </p>
                        <BotaoAcaoDestruir
                          label="Eliminar perfil"
                          titulo={`Eliminar o perfil de ${a.nome}?`}
                          // A única coisa que a pessoa pode não estar à
                          // espera é que eliminar o perfil cancela as
                          // aulas. É isso que o popup diz, e mais nada.
                          mensagem={
                            disciplinas.length === 0
                              ? `${a.nome} sai da tua conta.`
                              : `${a.nome} sai da tua conta, e ${disciplinas.length === 1 ? 'a matrícula' : 'as matrículas'} de ${disciplinas.join(', ')} ${disciplinas.length === 1 ? 'é cancelada' : 'são canceladas'}.`
                          }
                          action={arquivarAluno}
                        >
                          <input type="hidden" name="alunoId" value={a.id} />
                        </BotaoAcaoDestruir>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
              <h2 className="font-semibold">Receber um perfil de aluno</h2>
              {/* O outro lado da mesma operação. Não é "resgatar" nada: é
                  aceitar um perfil que alguém decidiu passar-te. */}
              <p className="text-sm text-foreground/60">
                Se alguém te passou um aluno — o teu próprio perfil, por exemplo — escreve aqui o
                código que te enviou.
              </p>
              <ReceberAlunoForm action={resgatarConvite} />
            </section>
          </>
        )}

        <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
          <h2 className="font-semibold">Apagar a conta</h2>
          <p className="text-sm text-foreground/60">
            Perdes o acesso e os dados da conta são apagados.
          </p>
          {superAdmin ? (
            <ApagarContaSuperAdminForm action={apagarContaSuperAdmin} outrosAdmins={outrosAdmins} />
          ) : (
            <BotaoAcaoDestruir
              label="Apagar conta"
              mensagem={TEXTOS_LEGAIS.apagarConta}
              action={apagarConta}
            />
          )}
        </section>
      </div>
    </main>
  )
}
