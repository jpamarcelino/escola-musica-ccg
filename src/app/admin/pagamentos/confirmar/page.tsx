import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { LinhaLista, GrupoLista } from '@/components/lista'
import { Distintivo } from '@/components/distintivo'
import { EmptyState } from '@/components/empty-state'

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
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: professoresData } = await supabase
    .from('perfis_escola')
    .select('id, profiles(nome)')
    .eq('tipo', 'professor')
    .order('nome', { referencedTable: 'profiles' })
  const professores = (
    (professoresData ?? []) as unknown as { id: string; profiles: { nome: string } | null }[]
  ).map((p) => ({
    id: p.id,
    nome: p.profiles?.nome ?? '',
  })) as Professor[]

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
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/admin/pagamentos" titulo="Mensalidades por Confirmar" />

        {professores.length === 0 ? (
          <EmptyState titulo="Ainda não há professores registados" />
        ) : (
          <GrupoLista>
            {professores.map((professor) => {
              const porConfirmar = porConfirmarPorProfessor.get(professor.id) ?? 0
              return (
                <LinhaLista
                  key={professor.id}
                  href={`/admin/pagamentos/confirmar/${professor.id}`}
                  titulo={professor.nome}
                  direita={porConfirmar > 0 ? <Distintivo>{porConfirmar}</Distintivo> : undefined}
                />
              )
            })}
          </GrupoLista>
        )}
      </div>
    </main>
  )
}
