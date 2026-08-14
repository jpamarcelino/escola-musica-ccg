import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarInstrumentos, atualizarFoto } from '@/lib/actions/professor'
import {
  atualizarNomeConta,
  atualizarEmailConta,
  atualizarPasswordConta,
  apagarConta,
  apagarContaSuperAdmin,
  logout,
} from '@/lib/actions/auth'
import { PageHeader } from '@/components/page-header'
import { SubmitButton } from '@/components/submit-button'
import { FotoConta } from '@/components/foto-conta'
import {
  EditarNomeForm,
  EditarEmailForm,
  AlterarPasswordForm,
} from '@/components/conta-forms'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { ApagarContaSuperAdminForm } from '@/components/apagar-conta-super-admin-form'
import { EmptyState } from '@/components/empty-state'
import { criarConviteMigracaoAluno, resgatarConvite } from '@/lib/actions/convites'
import { GerarLinkMigracaoForm, ResgatarConviteForm } from '@/components/convite-forms'
import { LigacaoTerciaria } from '@/components/ligacao-terciaria'

export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ erroHorarios?: string; erro?: string }>
}) {
  const { erroHorarios, erro } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profileRowData } = await supabase
    .from('profiles')
    .select('nome, foto_url, perfis_escola(tipo, programa, super_admin)')
    .eq('id', user.id)
    .single()

  const profileRow = profileRowData as {
    nome: string
    foto_url: string | null
    perfis_escola: { tipo: string; programa: string | null; super_admin: boolean } | null
  } | null

  const profile = profileRow
    ? {
        nome: profileRow.nome,
        foto_url: profileRow.foto_url,
        tipo: profileRow.perfis_escola?.tipo,
        programa: profileRow.perfis_escola?.programa,
        super_admin: profileRow.perfis_escola?.super_admin ?? false,
      }
    : null

  if (profile?.tipo === 'admin') {
    redirect('/admin/conta')
  }
  if (profile?.tipo !== 'professor' && profile?.tipo !== 'aluno') {
    redirect('/dashboard')
  }
  const ehProfessor = profile.tipo === 'professor'

  const { data: outrosAdminsData } = profile.super_admin
    ? await supabase
        .from('perfis_escola')
        .select('id, profiles(nome)')
        .eq('admin', true)
        .neq('id', user.id)
    : { data: [] }
  const outrosAdmins = (
    (outrosAdminsData ?? []) as unknown as { id: string; profiles: { nome: string } | null }[]
  ).map((p) => ({
    id: p.id,
    nome: p.profiles?.nome ?? '',
  }))

  const { data: meusAlunosData } = !ehProfessor
    ? await supabase
        .from('alunos')
        .select('id, nome, propria_conta_id')
        .eq('encarregado_id', user.id)
        .order('criado_em')
    : { data: [] }
  const meusAlunos = meusAlunosData ?? []

  const { data: instrumentosData } = ehProfessor
    ? await supabase
        .from('instrumentos')
        .select('id, nome')
        .eq('programa', profile.programa)
        .order('nome')
    : { data: [] }
  const todosInstrumentos = instrumentosData ?? []

  const { data: meusInstrumentosData } = ehProfessor
    ? await supabase
        .from('professor_instrumentos')
        .select('especialidade, instrumentos(id, nome)')
        .eq('professor_id', user.id)
    : { data: [] }
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

        <section className="space-y-3">
          <h2 className="font-semibold">Alterar password</h2>
          <AlterarPasswordForm action={atualizarPasswordConta} />
        </section>

        {!ehProfessor && (
          <section className="space-y-4">
            <h2 className="font-semibold">Perfis de aluno que geres</h2>
            {meusAlunos.length === 0 ? (
              <EmptyState titulo="Nenhum perfil de aluno" />
            ) : (
              <div className="space-y-3">
                {meusAlunos.map((a) => (
                  <div key={a.id} className="lista-item space-y-2">
                    <p className="lista-item-titulo">{a.nome}</p>
                    {a.propria_conta_id === user.id ? (
                      <p className="lista-item-sub">Este perfil és tu.</p>
                    ) : (
                      <GerarLinkMigracaoForm action={criarConviteMigracaoAluno} alunoId={a.id} />
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-foreground/50">
              Recebeste um link de migração de outra pessoa (ex: um encarregado a passar-te o teu
              próprio perfil)?
            </p>
            <ResgatarConviteForm action={resgatarConvite} />
          </section>
        )}

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
              <form action={atualizarInstrumentos} className="space-y-3">
                <div className="space-y-2">
                  {todosInstrumentos.map((i) => {
                    const meu = meusInstrumentos.find((m) => m.id === i.id)
                    return (
                      <div key={i.id} className="flex items-center gap-2 text-sm">
                        <label className="flex w-40 shrink-0 items-center gap-2">
                          <input
                            type="checkbox"
                            name="instrumentos"
                            value={i.id}
                            defaultChecked={meu !== undefined}
                          />
                          {i.nome}
                        </label>
                        <input
                          type="text"
                          name={`especialidade_${i.id}`}
                          defaultValue={meu?.especialidade ?? ''}
                          placeholder="Especialidade (opcional)"
                          className="w-full rounded border border-foreground/20 bg-background px-3 py-1 text-sm"
                        />
                      </div>
                    )
                  })}
                </div>
                <SubmitButton
                  textoAGuardar="A guardar disciplinas..."
                  className="rounded border border-foreground/20 px-3 py-1 text-sm"
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

        <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
          {profile.super_admin ? (
            <ApagarContaSuperAdminForm action={apagarContaSuperAdmin} outrosAdmins={outrosAdmins} />
          ) : (
            <BotaoAcaoDestruir
              label="Apagar conta"
              mensagem="Tens a certeza que queres apagar a tua conta? Esta ação é irreversível — perdes o acesso e todos os teus dados de conta são apagados. (O histórico de presenças e mensalidades mantém-se.)"
              action={apagarConta}
            />
          )}
        </section>
      </div>
    </main>
  )
}
