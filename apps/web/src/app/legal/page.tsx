import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DOCUMENTOS, CCG, CNIACC, LIVRO_RECLAMACOES_URL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Informação legal · Centro Cultural da Guarda',
  description: 'Privacidade, termos, cookies e informação do consumidor.',
}

// O índice dos documentos. Existe para haver um sítio só a que se aponta
// do rodapé e da área de Conta — em vez de quatro ligações repetidas em
// oito ecrãs.
export default function LegalIndexPage() {
  return (
    <main id="conteudo-principal" className="pinterest-legal">
      <div className="pinterest-legal-folha">
        <header className="pinterest-legal-cabecalho">
          <Link href="/" className="pinterest-legal-voltar" aria-label="Voltar ao início">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
          <div>
            <h1>Informação legal</h1>
            <p>Podes ler, guardar e imprimir qualquer um destes documentos, com ou sem conta.</p>
          </div>
        </header>

        <nav className="pinterest-legal-indice" aria-label="Documentos legais">
          {DOCUMENTOS.map((d) => (
            <Link key={d.tipo} href={d.caminho}>
              <strong>{d.titulo}</strong>
              <small>{d.resumo}</small>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <section className="pinterest-legal-seccao">
          <h2>Reclamações</h2>
          <div className="pinterest-legal-corpo">
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
          </div>
          {/* O Decreto-Lei 7/2004 pede identificação permanente do
              prestador. Fica no fim, em letra pequena, mas fica. */}
          <p className="pinterest-legal-nota">
            {CCG.nome} · NIPC {CCG.nipc} · {CCG.morada} · {CCG.email} · {CCG.telefone}
          </p>
        </section>
      </div>
    </main>
  )
}
