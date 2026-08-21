import Link from 'next/link'
import { formatarDataEscolar } from '@ccg/core'
import type { DocumentoLegal } from '@/lib/legal'
import { LIVRO_RECLAMACOES_URL } from '@/lib/legal'

// Um documento jurídico, renderizado a partir de dados.
//
// É uma página normal, não um modal: tem de poder ser lida sem sessão,
// imprimida, guardada em PDF pelo browser e copiada. Um texto contratual
// que só existe dentro de uma janela que fecha não cumpre o dever de
// informação permanente.
export function DocumentoLegalPagina({ documento }: { documento: DocumentoLegal }) {
  return (
    <main id="conteudo-principal" className="partitura-pagina legal-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/legal" className="partitura-voltar" aria-label="Voltar à informação legal">
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Centro Cultural da Guarda</p>
            <h1>{documento.titulo}</h1>
            <p>
              Versão {documento.versao} · Elaborado em{' '}
              {formatarDataEscolar(documento.elaboradoEm, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {documento.entradaEmVigor
                ? ` · Em vigor desde ${formatarDataEscolar(documento.entradaEmVigor, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}`
                : ' · Entrada em vigor a definir'}
            </p>
          </div>
        </header>

        <article className="legal-corpo">
          {documento.seccoes.map((s) => (
            <section key={`${s.numero ?? ''}${s.titulo}`}>
              <h2>{s.numero ? `${s.numero}. ${s.titulo}` : s.titulo}</h2>
              {s.blocos.map((b, i) => {
                if (b.tipo === 'paragrafo') return <p key={i}>{b.texto}</p>
                if (b.tipo === 'lista') {
                  return (
                    <ul key={i}>
                      {b.itens.map((item, j) => (
                        <li key={j}>{item}</li>
                      ))}
                    </ul>
                  )
                }
                return (
                  /* A tabela rola dentro da sua própria caixa: a 375px uma
                     tabela de duas colunas com frases inteiras não cabe, e
                     deixar a página inteira rolar de lado tornaria o texto
                     todo difícil de ler. */
                  <div key={i} className="legal-tabela-caixa">
                    <table className="legal-tabela">
                      <thead>
                        <tr>
                          <th scope="col">{b.colunas[0]}</th>
                          <th scope="col">{b.colunas[1]}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.linhas.map((linha, j) => (
                          <tr key={j}>
                            <td>{linha[0]}</td>
                            <td>{linha[1]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </section>
          ))}

          {/* A ligação só existe depois de o CCG estar registado como
              operador. Ver o comentário em lib/legal/entidade.ts. */}
          {documento.tipo === 'informacao' && LIVRO_RECLAMACOES_URL && (
            <section>
              <h2>Livro de Reclamações Eletrónico</h2>
              <p>
                <a href={LIVRO_RECLAMACOES_URL} target="_blank" rel="noopener noreferrer">
                  Abrir o Livro de Reclamações Eletrónico
                </a>
              </p>
            </section>
          )}
        </article>

        <nav className="legal-outros" aria-label="Outros documentos">
          <Link href="/legal">Ver todos os documentos legais</Link>
        </nav>
      </div>
    </main>
  )
}
