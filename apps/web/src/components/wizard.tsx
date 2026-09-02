import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { RodapeLegal } from '@/components/rodape-legal'

// Casca dos dois wizards de pedir aula — o público (/pedir-aula) e o
// autenticado (/aluno/[alunoId]/pedido). Os passos são os mesmos nos
// dois, por isso a estrutura também é.
//
// O aspeto também: os dois estão agora no sistema Pinterest. A prop
// `publico` voltou ao que era — decide só o rodapé legal e o subtítulo,
// porque quem já entrou não precisa que lhe expliquem que há passos.
//
// O interior difere: o percurso público foi reescrito com as classes
// `.pinterest-pedir-*`, e o autenticado continua a montar-se com o
// `CartaoLink`, partilhado por outras quatro páginas. Por isso a lista de
// escolhas é vestida por descendência, sem tocar no componente.

export type EscolhaFeita = {
  // O que a pessoa escolheu, pelas palavras dela: "Música", "10 anos".
  valor: string
  // Para onde voltar se quiser mudar. Sem href, a etiqueta fica inerte.
  href?: string
}

export function Wizard({
  publico = false,
  title,
  voltar,
  passo,
  totalPassos = 5,
  escolhas,
  children,
}: {
  // O rodapé com as ligações jurídicas só entra no percurso público.
  publico?: boolean
  title?: string
  voltar?: string
  // Em que ponto do percurso estamos. Sem isto (ecrãs de erro, becos),
  // não se mostra contagem nenhuma — seria mentira dizer "passo 3 de 5"
  // num ecrã que não é passo nenhum.
  //
  // São cinco: escolher escola (na página inicial), idade, disciplina,
  // professor e horários.
  passo?: number
  totalPassos?: number
  // O que já ficou decidido até aqui. O assistente pedia a idade logo ao
  // início e nunca mais a mostrava: quem se enganava só descobria no
  // fim, depois de escolher disciplina, professor e horários.
  escolhas?: EscolhaFeita[]
  children: React.ReactNode
}) {
  const cabecalho = (voltar || title) && (
    <header className="pinterest-pedido-cabecalho">
      {voltar ? (
        <Link
          href={voltar}
          className="pinterest-pedido-voltar"
          aria-label="Voltar"
        >
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
      <div>
        <p>
          Pedir uma aula
          {passo && (
            <span className="wizard-passo"> · Passo {passo} de {totalPassos}</span>
          )}
        </p>
        <h1>{title ?? 'Escolhe a escola'}</h1>
        {!publico && <p>Segue os passos para encontrar a opção certa.</p>}
      </div>
    </header>
  )

  const progresso = passo && (
    <ol
      className="pinterest-pedido-progresso"
      aria-label={`Passo ${passo} de ${totalPassos}`}
    >
      {Array.from({ length: totalPassos }, (_, i) => (
        <li
          key={i}
          data-estado={i + 1 < passo ? 'feito' : i + 1 === passo ? 'atual' : 'por-fazer'}
          aria-hidden="true"
        />
      ))}
    </ol>
  )

  const feitas = escolhas && escolhas.length > 0 && (
    <ul
      className="pinterest-pedido-feitas"
      aria-label="Escolhas até agora"
    >
      {escolhas.map((e) =>
        e.href ? (
          <li key={e.valor}>
            <Link href={e.href}>
              {e.valor}
              <span className="sr-only"> — mudar</span>
            </Link>
          </li>
        ) : (
          <li key={e.valor}><span>{e.valor}</span></li>
        )
      )}
    </ul>
  )

  // O percurso público, no sistema Pinterest. O fundo cinzento é do
  // invólucro para o rodapé legal assentar nele — fora do <main>, como na
  // página inicial, apanhava o branco do body.
  if (publico) {
    return (
      <div className="pinterest-publico-pagina">
        <main id="conteudo-principal" className="pinterest-pedir">
          {cabecalho}
          {progresso}
          {feitas}
          <div className="pinterest-pedido-conteudo">{children}</div>
        </main>
        {/* Quem está a explorar sem conta tem de conseguir ler os termos e
            a privacidade antes de se registar. Na área autenticada as
            mesmas ligações vivem em Conta. */}
        <RodapeLegal />
      </div>
    )
  }

  // Com sessão: a mesma moldura, sem o rodapé legal (essas ligações vivem
  // em Conta) e com espaço em baixo para a barra de navegação, que a
  // página pública não tem.
  return (
    <main id="conteudo-principal" className="pinterest-pedir pinterest-pedir-privado">
      {cabecalho}
      {progresso}
      {feitas}
      <div className="pinterest-pedido-conteudo">{children}</div>
    </main>
  )
}

// Lista de cartões dos passos de escolha (disciplina, professor, escola).
// Uma coluna no telemóvel e duas a partir de "md", como manda a secção 9.
export function ListaEscolhas({ children }: { children: React.ReactNode }) {
  return <div className="wizard-escolhas">{children}</div>
}
