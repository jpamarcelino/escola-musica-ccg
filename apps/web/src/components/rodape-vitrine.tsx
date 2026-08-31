import Link from 'next/link'
import { DOCUMENTOS, CCG, LIVRO_RECLAMACOES_URL } from '@/lib/legal'

// O rodapé legal na linguagem vitrine. As regras são as do
// RodapeLegal — o Decreto-Lei 7/2004 pede identificação permanente do
// prestador, e o Livro de Reclamações só ganha ligação externa quando o
// CCG estiver registado como operador. Muda a roupa, não a substância.
export function RodapeVitrine({ lema }: { lema?: string }) {
  return (
    <footer className="v-rodape">
      {lema && <p className="v-rodape-lema">{lema}</p>}
      <nav aria-label="Informação legal">
        {DOCUMENTOS.map((documento) => (
          <Link key={documento.tipo} href={documento.caminho}>
            {documento.titulo.replace(' e Regras do Serviço', '')}
          </Link>
        ))}
        {LIVRO_RECLAMACOES_URL ? (
          <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer">
            Livro de Reclamações
          </a>
        ) : (
          <Link href="/legal">Livro de Reclamações</Link>
        )}
      </nav>
      <p>
        {CCG.nome} · NIPC {CCG.nipc}
      </p>
    </footer>
  )
}
