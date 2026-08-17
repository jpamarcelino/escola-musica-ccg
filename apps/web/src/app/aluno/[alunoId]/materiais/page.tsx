import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MateriaisClient } from './materiais-client'

export default async function MateriaisPage({
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

  const { data: aluno } = await supabase
    .from('alunos')
    .select('nome')
    .eq('id', alunoId)
    .eq('encarregado_id', user.id)
    .maybeSingle()

  if (!aluno) {
    notFound()
  }

  // O metrónomo só faz sentido para alunos de música — dança e "Música para
  // bebés" não usam este material. Basta uma matrícula (em qualquer estado)
  // numa disciplina de programa 'musica'.
  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('instrumentos(programa)')
    .eq('aluno_id', alunoId)

  const temMusica = ((matriculas ?? []) as unknown as { instrumentos: { programa: string } | null }[]).some(
    (m) => m.instrumentos?.programa === 'musica'
  )

  return (
    <main id="conteudo-principal" className="partitura-pagina materiais-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href={`/aluno/${alunoId}`} className="partitura-voltar" aria-label={`Voltar à área de ${aluno.nome}`}>←</Link>
          {/* O subtítulo prometia "ferramentas" no plural e havia uma só,
              depois de a ficha do filho anunciar um caderno — quem vinha
              à espera de partituras ou trabalho de casa encontrava um
              metrónomo. Dizer o que está cá dentro evita a desilusão;
              quando houver mais, o texto acompanha. */}
          <div><p className="partitura-sobretitulo">Caderno de {aluno.nome}</p><h1>Materiais</h1><p>Por agora, o metrónomo. Partituras e trabalho de casa chegam depois.</p></div>
        </header>
        <MateriaisClient temMusica={temMusica} />
      </div>
    </main>
  )
}
