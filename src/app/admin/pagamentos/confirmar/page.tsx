import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { OptionCard } from '@/components/option-card'

type Professor = {
  id: string
  nome: string
}

type MatriculaResumo = {
  id: number
  professor_id: string
  valor_mensal: number | null
}

type MensalidadeResumo = {
  matricula_id: number
  pago: boolean
}

export default async function ConfirmarMensalidadesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: professoresData } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('tipo', 'professor')
    .order('nome')
  const professores = (professoresData ?? []) as Professor[]

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('id, professor_id, valor_mensal')
    .eq('estado', 'confirmado')
  const matriculas = (matriculasData ?? []) as unknown as MatriculaResumo[]

  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth() + 1

  const matriculaIds = matriculas.map((m) => m.id)
  const { data: mensalidadesData } =
    matriculaIds.length > 0
      ? await supabase
          .from('mensalidades')
          .select('matricula_id, pago')
          .eq('ano', ano)
          .eq('mes', mes)
          .in('matricula_id', matriculaIds)
      : { data: [] }
  const pagoPorMatricula = new Map(
    ((mensalidadesData ?? []) as MensalidadeResumo[]).map((m) => [m.matricula_id, m.pago])
  )

  const porConfirmarPorProfessor = new Map<string, number>()
  for (const m of matriculas) {
    const pago = pagoPorMatricula.get(m.id) ?? false
    if (pago) continue
    porConfirmarPorProfessor.set(
      m.professor_id,
      (porConfirmarPorProfessor.get(m.professor_id) ?? 0) + 1
    )
  }

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin/pagamentos" />
          <h1 className="text-2xl font-semibold text-foreground">
            Mensalidades por Confirmar
          </h1>
        </div>

        {professores.length === 0 ? (
          <p className="text-sm text-foreground/60">Ainda não há professores registados.</p>
        ) : (
          <div className="hub-stack">
            {professores.map((professor, idx) => (
              <OptionCard
                key={professor.id}
                href={`/admin/pagamentos/confirmar/${professor.id}`}
                nome={professor.nome}
                wide
                index={idx + 1}
                badge={porConfirmarPorProfessor.get(professor.id) ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
