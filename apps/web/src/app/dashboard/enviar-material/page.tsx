import { redirect } from 'next/navigation'
import { getSchoolProfileContext } from '@/lib/auth-context'
import { carregarAlunosAlvo } from '@/lib/alvos-mensagem'
import { EscolhaMaterial } from './escolha-material'
import { VoltarAtras } from '@/components/voltar-atras'

// Onde o professor deixa material de estudo.
//
// Dois tipos, com caminhos bem diferentes: o vídeo é um link para o
// YouTube, e a partitura é um ficheiro que fica connosco. O que têm em
// comum é o destino — o caderno de um ou dois alunos escolhidos a dedo.
export default async function EnviarMaterialPage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>
}) {
  const { aluno: alunoPedido } = await searchParams

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
    <main id="conteudo-principal" className="pinterest-enviar-material">
      <div className="pinterest-enviar-material-folha">
        <header className="pinterest-enviar-material-cabecalho">
          <VoltarAtras destino="/dashboard" className="pinterest-enviar-material-voltar" rotulo="Voltar ao início" tamanho={24} />
          <div>
            <h1>Enviar material</h1>
            <p>Partilha um vídeo ou uma partitura com os teus alunos.</p>
          </div>
        </header>

        {/* Vindo da ficha de um aluno, ele já vem escolhido. Só vale se
            for mesmo aluno deste professor — um id qualquer no endereço
            não pré-seleciona ninguém, e a função de publicar recusá-lo-ia
            de qualquer forma. */}
        <EscolhaMaterial
          alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, sub: a.sub }))}
          alunoInicial={alunos.some((a) => a.id === alunoPedido) ? alunoPedido : undefined}
        />
      </div>
    </main>
  )
}
