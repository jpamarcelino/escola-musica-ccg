import Link from 'next/link'
import type { Metadata } from 'next'
import { DOCUMENTOS, CCG, CNIACC, LIVRO_RECLAMACOES_URL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Informação legal · Centro Cultural da Guarda',
  description: 'Privacidade, termos, cookies e informação do consumidor.',
}

// O índice dos documentos. Existe para haver um sítio só a que se aponta
// do rodapé, da área de Conta e da app móvel — em vez de quatro ligações
// repetidas em oito ecrãs.
export default function LegalIndexPage() {
  return (
    <main id="conteudo-principal" className="partitura-pagina legal-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/" className="partitura-voltar" aria-label="Voltar ao início">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">{CCG.nome}</p>
            <h1>Informação legal</h1>
            <p>Podes ler, guardar e imprimir qualquer um destes documentos, com ou sem conta.</p>
          </div>
        </header>

        <nav className="partitura-links" aria-label="Documentos legais">
          {DOCUMENTOS.map((d) => (
            <Link key={d.tipo} href={d.caminho}>
              <span>{d.titulo}</span>
              <small>{d.resumo}</small>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </nav>

        <section className="legal-reclamacoes">
          <h2 className="secao-titulo">Reclamações</h2>
          <p>
            {LIVRO_RECLAMACOES_URL === null
              ? 'O Livro de Reclamações físico está disponível na secretaria. O Livro de Reclamações Eletrónico ficará acessível aqui depois de concluído o registo do CCG como operador.'
              : 'O Livro de Reclamações físico está disponível na secretaria, e o eletrónico através da ligação abaixo.'}
          </p>
          {LIVRO_RECLAMACOES_URL && (
            <p>
              <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer">
                Livro de Reclamações Eletrónico
              </a>
            </p>
          )}
          <p>
            Para resolução alternativa de litígios, a entidade competente para a Guarda é o{' '}
            <a href={CNIACC.url} target="_blank" rel="noopener noreferrer">
              CNIACC
            </a>
            . O recurso a estes mecanismos não elimina o direito de recorrer aos tribunais.
          </p>
          <p className="legal-contacto">
            {CCG.nome} · NIPC {CCG.nipc} · {CCG.morada} · {CCG.email} · {CCG.telefone}
          </p>
        </section>
      </div>
    </main>
  )
}
