import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth-context'
import { atualizarInstrumentos, atualizarFoto } from '@/lib/actions/professor'
import {
  atualizarNomeConta,
  atualizarEmailConta,
  atualizarPasswordConta,
  logout,
} from '@/lib/actions/auth'
import { PageHeader } from '@/components/page-header'
import { classesCampo } from '@/components/campo-formulario'
import { SubmitButton } from '@/components/submit-button'
import { FotoConta } from '@/components/foto-conta'
import {
  EditarNomeForm,
  EditarEmailForm,
  AlterarPasswordForm,
} from '@/components/conta-forms'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'
import { ehContaCCG } from '@/lib/navegacao'

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
    .select('nome, foto_url, perfis_escola(tipo, programa, admin)')
    .eq('id', user.id)
    .single()

  const profileRow = profileRowData as {
    nome: string
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
              <h2 className="font-semibold">A tua foto</h2>
              <FotoConta action={atualizarFoto} fotoUrl={profile.foto_url} nome={profile.nome} />
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Disciplinas que ensinas</h2>
              <p className="text-xs text-foreground/50">
                A especialidade é opcional — usa-a quando ensinas uma disciplina
                de forma diferente de outros professores (ex: &quot;Piano
                clássico&quot; vs. &quot;Piano jazz/rock&quot;). Aparece por baixo
                do teu nome quando um aluno escolher essa disciplina.
              </p>
              {/* Esta secção tinha ficado fora da migração para o design
                  system: os campos eram Tailwind cru com py-1 (30px de
                  altura) e a etiqueta do visto tinha um alvo de toque de
                  20px — metade do mínimo recomendado. Passa a usar
                  classesCampo, e em ecrã estreito cada disciplina empilha
                  em vez de espremer nome e especialidade na mesma linha. */}
              <form action={atualizarInstrumentos} className="space-y-4">
                <div className="space-y-3">
                  {todosInstrumentos.map((i) => {
                    const meu = meusInstrumentos.find((m) => m.id === i.id)
                    return (
                      <div
                        key={i.id}
                        className="flex flex-col gap-[6px] sm:flex-row sm:items-center sm:gap-3"
                      >
                        <label className="flex min-h-[44px] shrink-0 items-center gap-[10px] text-[15px] sm:w-44">
                          <input
                            type="checkbox"
                            name="instrumentos"
                            value={i.id}
                            defaultChecked={meu !== undefined}
                            className="h-[20px] w-[20px] shrink-0 accent-[var(--color-azul-fundo)]"
                          />
                          {i.nome}
                        </label>
                        <input
                          type="text"
                          name={`especialidade_${i.id}`}
                          defaultValue={meu?.especialidade ?? ''}
                          placeholder="Especialidade (opcional)"
                          aria-label={`Especialidade de ${i.nome}`}
                          className={classesCampo}
                        />
                      </div>
                    )
                  })}
                </div>
                <SubmitButton
                  textoAGuardar="A guardar disciplinas…"
                  className="flex h-[52px] w-full items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-raised)] disabled:opacity-50 motion-reduce:transition-none sm:w-auto sm:px-7"
                >
                  Guardar disciplinas
                </SubmitButton>
              </form>
            </section>
          </>
        )}

        <section className="border-t border-[var(--color-linha)] pt-6">
          <form action={logout}>
            <LigacaoTerciaria>Sair da conta</LigacaoTerciaria>
          </form>
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
