import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarInstrumentos, atualizarFoto } from '@/lib/actions/professor'
import { BackButton } from '@/components/back-button'

export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ erroHorarios?: string }>
}) {
  const { erroHorarios } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, tipo, programa, foto_url')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: instrumentosData } = await supabase
    .from('instrumentos')
    .select('id, nome')
    .eq('programa', profile.programa)
    .order('nome')
  const todosInstrumentos = instrumentosData ?? []

  const { data: meusInstrumentosData } = await supabase
    .from('professor_instrumentos')
    .select('especialidade, instrumentos(id, nome)')
    .eq('professor_id', user.id)
  const meusInstrumentos = (
    (meusInstrumentosData ?? []) as unknown as {
      especialidade: string | null
      instrumentos: { id: number; nome: string } | null
    }[]
  )
    .filter((r) => r.instrumentos !== null)
    .map((r) => ({ ...r.instrumentos!, especialidade: r.especialidade }))

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <h1 className="text-2xl font-semibold text-foreground">Conta</h1>
        </div>

        {erroHorarios && (
          <p className="rounded border border-red-600/30 p-3 text-sm text-red-600">
            {erroHorarios}
          </p>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold">Dados</h2>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-foreground/60">Nome: </span>
              {profile.nome}
            </p>
            <p>
              <span className="text-foreground/60">Email: </span>
              {user.email}
            </p>
          </div>
          <p className="text-xs text-foreground/50">
            Para mudar a password, usa a opção &quot;Esqueci a password&quot;
            no ecrã de login.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">A tua foto</h2>
          <div className="flex items-center gap-4">
            {profile.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.foto_url}
                alt={profile.nome}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-foreground/10 text-xs text-foreground/50">
                Sem foto
              </div>
            )}
            <form action={atualizarFoto} className="flex items-center gap-2">
              <input
                type="file"
                name="foto"
                accept="image/*"
                required
                className="text-sm"
              />
              <button
                type="submit"
                className="rounded border border-foreground/20 px-3 py-1 text-sm hover:bg-foreground/5"
              >
                Carregar foto
              </button>
            </form>
          </div>
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
            <button
              type="submit"
              className="rounded border border-foreground/20 px-3 py-1 text-sm"
            >
              Guardar disciplinas
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
