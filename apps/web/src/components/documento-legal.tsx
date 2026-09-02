import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { formatarDataEscolar } from '@ccg/core'
import type { DocumentoLegal } from '@/lib/legal'
import { LIVRO_RECLAMACOES_URL } from '@/lib/legal'

// Um documento jurídico, renderizado a partir de dados.
//
// É uma página normal, não um modal: tem de poder ser lida sem sessão,
// imprimida, guardada em PDF pelo browser e copiada. Um texto contratual
// que só existe dentro de uma janela que fecha não cumpre o dever de
// informação permanente.
//
// O texto é o mesmo de sempre — o que mudou foi a leitura: uma superfície
// branca só, para o olho não saltar entre cartões a cada título, e uma
// medida de linha que se aguenta num telemóvel.
export function DocumentoLegalPagina({ documento }: { documento: DocumentoLegal }) {
  const data = (valor: string) =>
    formatarDataEscolar(valor, { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main id="conteudo-principal" className="pinterest-legal">
      <div className="pinterest-legal-folha">
        <header className="pinterest-legal-cabecalho">
          <Link href="/legal" className="pinterest-legal-voltar" aria-label="Voltar à informação legal">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
          <div>
            <h1>{documento.titulo}</h1>
            <p>
              Versão {documento.versao} · Elaborado em {data(documento.elaboradoEm)}
              {documento.entradaEmVigor
                ? ` · Em vigor desde ${data(documento.entradaEmVigor)}`
                : ' · Entrada em vigor a definir'}
            </p>
          </div>
        </header>

        <article className="pinterest-legal-corpo">
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
                  <div key={i} className="pinterest-legal-tabela-caixa">
                    <table className="pinterest-legal-tabela">
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

        <Link href="/legal" className="pinterest-legal-voltar-indice">
          Ver todos os documentos legais
        </Link>
      </div>
    </main>
  )
}
