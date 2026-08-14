import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { EmptyState } from '@/components/empty-state'

type Matricula = {
  id: number
  instrumentos: { nome: string } | null
}

type Presenca = {
  id: number
  data: string
  estado: string
  matricula_id: number
}

const ESTADO_LABEL: Record<string, string> = {
  presente: 'Presente',
  falta_aviso: 'Falta c/ aviso',
  falta_sem_aviso: 'Falta s/ aviso',
}

export default async function HistoricoAlunoPage({
  params,
}: {
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params

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

  const { data: alunoData } = await supabase
    .from('alunos')
    .select('nome')
    .eq('id', alunoId)
    .maybeSingle()

  if (!alunoData) {
    notFound()
  }

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('id, instrumentos(nome)')
    .eq('professor_id', user.id)
    .eq('aluno_id', alunoId)
    .eq('estado', 'confirmado')
  const matriculas = (matriculasData ?? []) as unknown as Matricula[]
  const instrumentoPorMatricula = new Map(
    matriculas.map((m) => [m.id, m.instrumentos?.nome ?? null])
  )
  const matriculaIds = matriculas.map((m) => m.id)

  const { data: presencasData } =
    matriculaIds.length > 0
      ? await supabase
          .from('presencas')
          .select('id, data, estado, matricula_id')
          .in('matricula_id', matriculaIds)
          .order('data', { ascending: false })
      : { data: [] }
  const presencas = (presencasData ?? []) as unknown as Presenca[]

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Presenças', href: '/dashboard/presencas' },
            { label: 'Histórico', href: '/dashboard/presencas/historico' },
            { label: alunoData.nome },
          ]}
        />
        <PageHeader voltar="/dashboard/presencas/historico" titulo={alunoData.nome} />

        {presencas.length === 0 ? (
          <EmptyState titulo="Ainda não há presenças registadas para este aluno" />
        ) : (
          <div className="space-y-2">
            {presencas.map((p) => (
              <div key={p.id} className="lista-item flex items-center justify-between gap-3">
                <div>
                  <p className="lista-item-titulo">{p.data}</p>
                  {instrumentoPorMatricula.get(p.matricula_id) && (
                    <p className="lista-item-sub">{instrumentoPorMatricula.get(p.matricula_id)}</p>
                  )}
                </div>
                <span className={`estado-pill estado-${p.estado}`}>
                  {ESTADO_LABEL[p.estado] ?? p.estado}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
