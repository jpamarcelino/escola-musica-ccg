import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calcularIdade } from '@/lib/idade'
import { desmatricularAluno } from '@/lib/actions/professor'
import { BackButton } from '@/components/back-button'
import { BotaoDesmatricular } from '@/components/desmatricular-botao'

type Matricula = {
  id: number
  instrumentos: { nome: string } | null
  alunos: {
    nome: string
    data_nascimento: string | null
    encarregado: { email: string | null; telefone: string | null } | null
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
    .from('perfis_escola')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: matriculaData } = await supabase
    .from('matriculas')
    .select(
      'id, instrumentos(nome), alunos(nome, data_nascimento, encarregado:profiles!alunos_encarregado_id_fkey(email, telefone))'
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

  const idade = calcularIdade(matricula.alunos?.data_nascimento)

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href={`/dashboard/agenda/${horarioId}`} />
          <h1 className="text-2xl font-semibold text-foreground">
            {matricula.alunos?.nome}
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
          {matricula.alunos?.encarregado?.email && (
            <p>
              <span className="text-foreground/60">Email do encarregado: </span>
              <a href={`mailto:${matricula.alunos.encarregado.email}`} className="underline">
                {matricula.alunos.encarregado.email}
              </a>
            </p>
          )}
          {matricula.alunos?.encarregado?.telefone && (
            <p>
              <span className="text-foreground/60">Telemóvel do encarregado: </span>
              <a href={`tel:${matricula.alunos.encarregado.telefone}`} className="underline">
                {matricula.alunos.encarregado.telefone}
              </a>
            </p>
          )}
        </section>

        <section className="border-t border-foreground/10 pt-6">
          <form action={desmatricularAluno}>
            <input type="hidden" name="matriculaId" value={matricula.id} />
            <input type="hidden" name="horarioId" value={horarioId} />
            <BotaoDesmatricular
              mensagemConfirmacao={`Tens a certeza que queres desmatricular ${matricula.alunos?.nome} (${matricula.instrumentos?.nome})? Esta ação é irreversível.`}
            />
          </form>
        </section>
      </div>
    </main>
  )
}
