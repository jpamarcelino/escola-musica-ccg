import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'

type Matricula = {
  estado: string
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, tipo')
    .eq('id', user.id)
    .single()

  let matricula: Matricula | null = null
  if (profile?.tipo === 'aluno') {
    const { data } = await supabase
      .from('matriculas')
      .select(
        'estado, instrumentos(nome), profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim)'
      )
      .eq('aluno_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    matricula = data as unknown as Matricula | null
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Bem-vindo, {profile?.nome}</h1>
        <p className="text-sm text-foreground/60">
          Estás autenticado como <strong>{profile?.tipo}</strong>.
        </p>

        {profile?.tipo === 'aluno' && (
          <div className="space-y-3 rounded border border-foreground/15 p-4 text-left">
            {!matricula && (
              <>
                <p className="text-sm text-foreground/60">
                  Ainda não pediste nenhuma aula.
                </p>
                <Link
                  href="/aluno/pedido"
                  className="block rounded bg-black py-2 text-center text-white"
                >
                  Pedir aula
                </Link>
              </>
            )}
            {matricula && matricula.estado === 'a_escolher' && (
              <p className="text-sm">
                Pedido enviado para{' '}
                <strong>{matricula.profiles?.nome}</strong> (
                {matricula.instrumentos?.nome}). A aguardar que o professor
                escolha o horário final.
              </p>
            )}
            {matricula && matricula.estado === 'confirmado' && matricula.horarios && (
              <p className="text-sm">
                Aula confirmada com <strong>{matricula.profiles?.nome}</strong>{' '}
                ({matricula.instrumentos?.nome}): {matricula.horarios.dia_semana}
                , {matricula.horarios.hora_inicio.slice(0, 5)}–
                {matricula.horarios.hora_fim.slice(0, 5)}.
              </p>
            )}
          </div>
        )}

        <form action={logout}>
          <button
            type="submit"
            className="rounded border border-foreground/20 px-4 py-2"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  )
}
