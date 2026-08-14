import Link from 'next/link'

// Casca dos dois wizards de pedir aula — o público (/pedir-aula) e o
// autenticado (/aluno/[alunoId]/pedido). Os passos são os mesmos nos dois,
// por isso a moldura também é.
export function Wizard({
  title,
  voltar,
  children,
}: {
  title?: string
  voltar?: string
  children: React.ReactNode
}) {
  return (
    <main id="conteudo-principal" className="partitura-pagina wizard-partitura">
      <div className="partitura-folha">
        {(voltar || title) && (
          <header className="partitura-agenda-cabecalho">
            {voltar ? <Link href={voltar} className="partitura-voltar" aria-label="Voltar">←</Link> : <span />}
            <div><p className="partitura-sobretitulo">Pedir uma aula</p><h1>{title ?? 'Escolhe a escola'}</h1><p>Segue os passos para encontrar a opção certa.</p></div>
          </header>
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
