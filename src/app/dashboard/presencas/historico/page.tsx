import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { LinhaLista, GrupoLista } from '@/components/lista'
import { EmptyState } from '@/components/empty-state'

type MatriculaAluno = {
  id: number
  aluno_id: string
  alunos: { nome: string } | null
}

type AlunoResumo = {
  alunoId: string
  nome: string
  matriculaIds: number[]
  registos: number
}

export default async function HistoricoPresencasPage() {
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

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('id, aluno_id, alunos(nome)')
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
  const matriculas = (matriculasData ?? []) as unknown as MatriculaAluno[]

  const porAluno = new Map<string, AlunoResumo>()
  for (const m of matriculas) {
    const atual = porAluno.get(m.aluno_id) ?? {
      alunoId: m.aluno_id,
      nome: m.alunos?.nome ?? '',
      matriculaIds: [],
      registos: 0,
    }
    atual.matriculaIds.push(m.id)
    porAluno.set(m.aluno_id, atual)
  }

  const todasMatriculaIds = matriculas.map((m) => m.id)
  if (todasMatriculaIds.length > 0) {
    const { data: presencasData } = await supabase
      .from('presencas')
      .select('matricula_id')
      .in('matricula_id', todasMatriculaIds)
    const matriculaParaAluno = new Map(matriculas.map((m) => [m.id, m.aluno_id]))
    for (const p of presencasData ?? []) {
      const alunoId = matriculaParaAluno.get(p.matricula_id)
      const resumo = alunoId ? porAluno.get(alunoId) : undefined
      if (resumo) resumo.registos += 1
    }
  }

  const alunos = [...porAluno.values()].sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard/presencas" titulo="Histórico de Presenças" />

        {alunos.length === 0 ? (
          <EmptyState titulo="Ainda não tens alunos confirmados" />
        ) : (
          <GrupoLista>
            {alunos.map((a) => (
              <LinhaLista
                key={a.alunoId}
                href={`/dashboard/presencas/historico/${a.alunoId}`}
                titulo={a.nome}
              />
            ))}
          </GrupoLista>
        )}
      </div>
    </main>
  )
}
