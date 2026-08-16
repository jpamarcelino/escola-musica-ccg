import Link from 'next/link'

// Casca dos dois wizards de pedir aula — o público (/pedir-aula) e o
// autenticado (/aluno/[alunoId]/pedido). Os passos são os mesmos nos dois,
// por isso a moldura também é.

export type EscolhaFeita = {
  // O que a pessoa escolheu, pelas palavras dela: "Música", "10 anos".
  valor: string
  // Para onde voltar se quiser mudar. Sem href, a etiqueta fica inerte.
  href?: string
}

export function Wizard({
  title,
  voltar,
  passo,
  totalPassos = 5,
  escolhas,
  children,
}: {
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
  return (
    <main id="conteudo-principal" className="partitura-pagina wizard-partitura">
      <div className="partitura-folha">
        {(voltar || title) && (
          <header className="partitura-agenda-cabecalho">
            {voltar ? <Link href={voltar} className="partitura-voltar" aria-label="Voltar">←</Link> : <span />}
            <div>
              <p className="partitura-sobretitulo">
                Pedir uma aula
                {passo && (
                  <span className="wizard-passo"> · Passo {passo} de {totalPassos}</span>
                )}
              </p>
              <h1>{title ?? 'Escolhe a escola'}</h1>
              <p>Segue os passos para encontrar a opção certa.</p>
            </div>
          </header>
        )}

        {passo && (
          <ol
            className="wizard-progresso"
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
        )}

        {escolhas && escolhas.length > 0 && (
          <ul className="wizard-escolhas-feitas" aria-label="Escolhas até agora">
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
        )}

        <div className="wizard-partitura-conteudo">{children}</div>
      </div>
    </main>
  )
}

// Lista de cartões dos passos de escolha (disciplina, professor, escola).
// Uma coluna no telemóvel e duas a partir de "md", como manda a secção 9.
export function ListaEscolhas({ children }: { children: React.ReactNode }) {
  return <div className="wizard-escolhas">{children}</div>
}
