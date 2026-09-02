import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ListaComPesquisa } from '@/components/lista-com-pesquisa'

type Matricula = {
  aluno_id: string
  aluno: { nome: string } | null
}

export default async function AdminProfessorAlunosPage({
  params,
}: {
  params: Promise<{ professorId: string }>
}) {
  const { professorId } = await params

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

  const { data: professorPerfilData } = await supabase
    .from('perfis_escola')
    .select('profiles(nome)')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  const professorPerfil = professorPerfilData as { profiles: { nome: string } | null } | null

  if (!professorPerfil) {
    notFound()
  }

  const professorData = { nome: professorPerfil.profiles?.nome ?? '' }

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select('aluno_id, aluno:alunos(nome)')
    .eq('professor_id', professorId)
    // Só quem tem aulas a decorrer. Sem isto, quem cancelou continuava a
    // aparecer como aluno deste professor — antes da migração 0029 a
    // matrícula era apagada e não havia diferença; agora há.
    .eq('estado', 'confirmado')
  const matriculas = (matriculasData ?? []) as unknown as Matricula[]

  const alunosPorId = new Map<string, string>()
  for (const m of matriculas) {
    if (m.aluno) alunosPorId.set(m.aluno_id, m.aluno.nome)
  }
  const alunos = [...alunosPorId.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-diretorio-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><VoltarAtras destino={`/admin/professores/${professorId}`} className="partitura-voltar" rotulo="Voltar à ficha do professor">←</VoltarAtras><div><p className="partitura-sobretitulo">Alunos do professor</p><h1>{professorData.nome}</h1><p>{alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}</p></div></header>

        {alunos.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--color-tinta-suave)' }}>
            Ainda não tem alunos.
          </p>
        ) : (
          <div className="admin-diretorio"><ListaComPesquisa
            itens={alunos}
            hrefPrefix="/admin/alunos/"
            placeholder="Pesquisar aluno por nome…"
          /></div>
        )}
      </div>
    </main>
  )
}
import { VoltarAtras } from '@/components/voltar-atras'
