import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MateriaisClient } from './materiais-client'
import { EmptyState } from '@/components/empty-state'

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

  // Para onde volta a seta. Com mais do que um aluno na conta, volta à
  // escolha de caderno; com um só, essa página redirecionaria para aqui
  // outra vez — a seta apontaria para si mesma.
  const { count: quantosAlunos } = await supabase
    .from('alunos')
    .select('id', { count: 'exact', head: true })
    .eq('encarregado_id', user.id)

  const voltarPara = (quantosAlunos ?? 0) > 1 ? '/dashboard/materiais' : '/dashboard'

  // O metrónomo só faz sentido para alunos de música — dança e "Música para
  // bebés" não usam este material. Basta uma matrícula a decorrer numa
  // disciplina de programa 'musica'.
  const { data: matriculas } = await supabase
    .from('matriculas')
    .select('instrumentos(programa)')
    .eq('aluno_id', alunoId)
    // "A decorrer" e não "qualquer estado": quem cancelou perde o acesso
    // aos materiais no mesmo instante. Antes da migração 0029 a matrícula
    // cancelada era apagada e a distinção não existia.
    .eq('estado', 'confirmado')

  const inscricoes = (matriculas ?? []) as unknown as { instrumentos: { programa: string } | null }[]

  // Sem aulas a decorrer, não há caderno nenhum — nem metrónomo, nem os
  // separadores vazios. Os materiais são o que se leva de uma aula, e um
  // perfil sem matrícula não tem aula de onde os levar. A lista de
  // escolha já o mostra a cinzento; isto fecha a porta a quem chegue
  // aqui pelo endereço direto.
  const temAulas = inscricoes.length > 0

  const temMusica = inscricoes.some((m) => m.instrumentos?.programa === 'musica')

  // Os vídeos que os professores deste aluno lhe deixaram. A RLS (0048)
  // já limita a quem é educando de quem entrou; o filtro por aluno é o
  // que separa os cadernos de dois irmãos.
  const { data: videosData } = await supabase
    .from('materiais_alunos')
    .select('materiais!inner(id, youtube_id, titulo, descricao, criado_em, professor:profiles!materiais_professor_id_fkey(nome))')
    .eq('aluno_id', alunoId)

  const videos = ((videosData ?? []) as unknown as {
    materiais: {
      id: number
      youtube_id: string
      titulo: string
      descricao: string | null
      criado_em: string
      professor: { nome: string } | null
    }
  }[])
    .map((l) => l.materiais)
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))

  return (
    <main id="conteudo-principal" className="partitura-pagina materiais-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href={voltarPara} className="partitura-voltar" aria-label={voltarPara === '/dashboard/materiais' ? 'Voltar à escolha de aluno' : 'Voltar ao início'}>←</Link>
          {/* O subtítulo diz o que está cá dentro. Vídeos e partituras já
              têm separador, mas ainda estão vazios — prometer material
              que não existe é o que fazia esta página desiludir. */}
          <div><p className="partitura-sobretitulo">Caderno de {aluno.nome}</p><h1>Materiais</h1><p>{!temAulas ? 'Sem aulas a decorrer.' : temMusica ? 'O metrónomo já funciona. Vídeos e partituras chegam quando o professor os deixar.' : 'Vídeos e partituras chegam quando o professor os deixar.'}</p></div>
        </header>
        {temAulas ? (
          <MateriaisClient temMusica={temMusica} videos={videos} />
        ) : (
          <EmptyState
            titulo={`${aluno.nome.split(' ')[0]} ainda não tem aulas`}
            descricao="Os materiais vêm das aulas — vídeos e partituras são do professor, e o metrónomo serve para estudar o que se deu. Assim que houver uma inscrição a decorrer, o caderno abre."
            acao={
              <Link href={`/aluno/${alunoId}/pedido`} className="familia-adicionar-botao">
                Pedir uma aula
              </Link>
            }
          />
        )}
      </div>
    </main>
  )
}
