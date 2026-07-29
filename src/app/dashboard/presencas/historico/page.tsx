import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { OptionCard } from '@/components/option-card'

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
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard/presencas" />
          <h1 className="text-2xl font-semibold text-foreground">Histórico de Presenças</h1>
        </div>

        {alunos.length === 0 ? (
          <p className="text-sm text-foreground/60">Ainda não tens alunos confirmados.</p>
        ) : (
          <div className="hub-stack compacto">
            {alunos.map((a, idx) => (
              <OptionCard
                key={a.alunoId}
                href={`/dashboard/presencas/historico/${a.alunoId}`}
                nome={a.nome}
                wide
                compacto
                index={idx + 1}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
