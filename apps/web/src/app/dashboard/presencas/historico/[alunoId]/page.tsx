import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatarDataEscolar } from '@ccg/core'
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

function inicialMaiuscula(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase('pt-PT') + texto.slice(1)
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

  const [{ data: profile }, { data: alunoData }, { data: matriculasData }] =
    await Promise.all([
      supabase.from('perfis_escola').select('tipo').eq('id', user.id).single(),
      supabase.from('alunos').select('nome').eq('id', alunoId).maybeSingle(),
      supabase
        .from('matriculas')
        .select('id, instrumentos(nome)')
        .eq('professor_id', user.id)
        .eq('aluno_id', alunoId)
        .eq('estado', 'confirmado'),
    ])

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  if (!alunoData) {
    notFound()
  }
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
  const presentes = presencas.filter((p) => p.estado === 'presente').length
  const percentagemPresencas = presencas.length > 0
    ? Math.round((presentes / presencas.length) * 100)
    : null
  const porMes = new Map<string, Presenca[]>()
  for (const presenca of presencas) {
    const chave = presenca.data.slice(0, 7)
    porMes.set(chave, [...(porMes.get(chave) ?? []), presenca])
  }

  return (
    <main id="conteudo-principal" className="partitura-pagina presencas-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard/presencas/historico" className="partitura-voltar" aria-label="Voltar ao histórico">←</Link>
          <div><p className="partitura-sobretitulo">Histórico individual</p><h1>{alunoData.nome}</h1>{percentagemPresencas !== null && <p>{percentagemPresencas}% de presenças · {presencas.length} {presencas.length === 1 ? 'aula registada' : 'aulas registadas'}</p>}</div>
        </header>

        {presencas.length === 0 ? (
          <EmptyState titulo="Ainda não há presenças registadas para este aluno" />
        ) : (
          <div className="presencas-historico">
            {[...porMes.entries()].map(([mes, registos]) => (
              <section key={mes}>
                <header><h2>{inicialMaiuscula(formatarDataEscolar(`${mes}-01`, { month: 'long', year: 'numeric' }))}</h2><span>{registos.length}</span></header>
                <div>
                  {registos.map((p) => (
                    <article key={p.id}>
                      <time>{inicialMaiuscula(
                        formatarDataEscolar(p.data, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })
                      )}</time>
                      <span>{instrumentoPorMatricula.get(p.matricula_id)}</span>
                      <strong data-estado={p.estado}>{ESTADO_LABEL[p.estado] ?? p.estado}</strong>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
