import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calcularIdade } from '@/lib/idade'
import { BackButton } from '@/components/back-button'

type Matricula = {
  id: number
  instrumentos: { nome: string } | null
  profiles: {
    nome: string
    email: string | null
    telefone: string | null
    data_nascimento: string | null
  } | null
}

export default async function AlunoDaAulaPage({
  params,
}: {
  params: Promise<{ horarioId: string; matriculaId: string }>
}) {
  const { horarioId, matriculaId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: matriculaData } = await supabase
    .from('matriculas')
    .select(
      'id, instrumentos(nome), profiles!matriculas_aluno_id_fkey(nome, email, telefone, data_nascimento)'
    )
    .eq('id', Number(matriculaId))
    .eq('horario_final_id', Number(horarioId))
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .maybeSingle()
  const matricula = matriculaData as unknown as Matricula | null

  if (!matricula) {
    notFound()
  }

  const idade = calcularIdade(matricula.profiles?.data_nascimento)

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href={`/dashboard/agenda/${horarioId}`} />
          <h1 className="text-2xl font-semibold text-foreground">
            {matricula.profiles?.nome}
          </h1>
        </div>

        <section className="space-y-2 text-sm">
          <p>
            <span className="text-foreground/60">Disciplina: </span>
            {matricula.instrumentos?.nome}
          </p>
          {idade !== null && (
            <p>
              <span className="text-foreground/60">Idade: </span>
              {idade} anos
            </p>
          )}
          {matricula.profiles?.email && (
            <p>
              <span className="text-foreground/60">Email: </span>
              <a href={`mailto:${matricula.profiles.email}`} className="underline">
                {matricula.profiles.email}
              </a>
            </p>
          )}
          {matricula.profiles?.telefone && (
            <p>
              <span className="text-foreground/60">Telemóvel: </span>
              <a href={`tel:${matricula.profiles.telefone}`} className="underline">
                {matricula.profiles.telefone}
              </a>
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
