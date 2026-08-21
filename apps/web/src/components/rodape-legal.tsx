import Link from 'next/link'
import { DOCUMENTOS, CCG, LIVRO_RECLAMACOES_URL } from '@/lib/legal'

// O rodapé das páginas públicas.
//
// Está aqui, e não na navegação inferior, por uma razão prática: cinco
// separadores novos numa barra que já tem cinco tornava-a ilegível, e
// informação legal não é um destino que se visite todas as semanas — é
// um destino que tem de existir e ser encontrável quando se procura.
//
// O Decreto-Lei 7/2004 pede identificação permanente do prestador; é isso
// que a linha de baixo faz, em todas as páginas onde este rodapé entra.
export function RodapeLegal() {
  return (
    <footer className="rodape-legal">
      <ul>
        {DOCUMENTOS.map((d) => (
          <li key={d.tipo}>
            <Link href={d.caminho}>{d.titulo.replace(' e Regras do Serviço', '')}</Link>
          </li>
        ))}
        {LIVRO_RECLAMACOES_URL ? (
          <li>
            <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer">
              Livro de Reclamações
            </a>
          </li>
        ) : (
          <li>
            <Link href="/legal">Livro de Reclamações</Link>
          </li>
        )}
      </ul>
      <p>
        {CCG.nome} · NIPC {CCG.nipc} · {CCG.morada}
      </p>
    </footer>
  )
}
