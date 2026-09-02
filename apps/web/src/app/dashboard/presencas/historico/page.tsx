import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth-context'
import { EmptyState } from '@/components/empty-state'
import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react'

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
  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: matriculasData }] = await Promise.all([
    supabase.from('perfis_escola').select('tipo').eq('id', user.id).single(),
    supabase
      .from('matriculas')
      .select('id, aluno_id, alunos(nome)')
      .eq('professor_id', user.id)
      .eq('estado', 'confirmado'),
  ])

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

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
    <main id="conteudo-principal" className="pinterest-presencas-fluxo pinterest-presencas-historico-lista">
      <div className="pinterest-presencas-fluxo-folha">
        <header className="pinterest-presencas-fluxo-cabecalho">
          <Link href="/dashboard/presencas" className="pinterest-presencas-fluxo-voltar" aria-label="Voltar a presenças"><ChevronLeft size={24} strokeWidth={2.1} aria-hidden="true" /></Link>
          <div><h1>Histórico</h1><p>{alunos.length > 0 ? `${alunos.length} ${alunos.length === 1 ? 'aluno confirmado' : 'alunos confirmados'}` : 'Presenças por aluno.'}</p></div>
        </header>

        {alunos.length === 0 ? (
          <EmptyState titulo="Ainda não tens alunos confirmados" />
        ) : (
          <div className="presencas-alunos">
            {alunos.map((a) => (
              <Link
                key={a.alunoId}
                href={`/dashboard/presencas/historico/${a.alunoId}`}
              ><span aria-hidden="true"><UserRound size={20} /></span><span><strong>{a.nome}</strong><small>{a.registos === 0 ? 'Ainda sem registos' : `${a.registos} ${a.registos === 1 ? 'registo' : 'registos'}`}</small></span><ChevronRight size={19} aria-hidden="true" /></Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
