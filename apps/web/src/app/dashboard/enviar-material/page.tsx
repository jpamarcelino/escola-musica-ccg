import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { carregarAlunosAlvo } from '@/lib/alvos-mensagem'
import { EnviarVideoForm } from './enviar-video-form'

// Onde o professor deixa material de estudo.
//
// Por agora só vídeos. As partituras vêm a seguir e não vão ser links do
// YouTube — daí a página ter nome de material e não de vídeo.
export default async function EnviarMaterialPage() {
  const { supabase, user, profile } = await getSchoolProfileContext()

  if (!user) {
    redirect('/login')
  }

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  // A mesma lista que a ferramenta de Mensagens usa: alunos com aulas a
  // decorrer com este professor, um por pessoa mesmo que tenha duas
  // disciplinas. Quem manda no alcance real é `publicar_material` (0048).
  const alunos = await carregarAlunosAlvo(supabase, user.id)

  return (
    <main id="conteudo-principal" className="partitura-pagina mensagem-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Caderno dos teus alunos</p>
            <h1>Enviar material</h1>
            <p>Um vídeo do YouTube, para um aluno ou para vários.</p>
          </div>
        </header>

        <EnviarVideoForm
          alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, sub: a.sub }))}
        />
      </div>
    </main>
  )
}
