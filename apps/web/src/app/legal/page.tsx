import Link from 'next/link'
import type { Metadata } from 'next'
import { DOCUMENTOS, CCG, CNIACC, LIVRO_RECLAMACOES_URL } from '@/lib/legal'
import { SimboloCCG } from '@/components/simbolo-ccg'

export const metadata: Metadata = {
  title: 'Informação legal · Centro Cultural da Guarda',
  description: 'Privacidade, termos, cookies e informação do consumidor.',
}

// O índice dos documentos. Existe para haver um sítio só a que se aponta
// do rodapé, da área de Conta e da app móvel — em vez de quatro ligações
// repetidas em oito ecrãs.
export default function LegalIndexPage() {
  return (
    <main id="conteudo-principal" className="v-pagina v-pagina-sem-capsula">
      <div className="v-folha">
        <div className="v-topo">
          <Link href="/" className="v-voltar" aria-label="Voltar ao início">
            ‹
          </Link>
          <span className="v-topo-marca" aria-hidden="true">
            <SimboloCCG />
          </span>
        </div>

        <div style={{ padding: '34px 22px 0' }}>
          <p className="v-sobretitulo">{CCG.nome}</p>
          <h1 className="v-titulo">Informação legal</h1>
          <div className="v-traco" />
          <p className="v-entrada">
            Podes ler, guardar e imprimir qualquer um destes documentos, com ou sem conta.
          </p>
        </div>

        <div className="v-lista" aria-label="Documentos legais">
          {DOCUMENTOS.map((d) => (
            <div key={d.tipo} className="v-lista-linha v-lista-linha-simples">
              <Link href={d.caminho} className="v-lista-alvo">
                <strong>{d.titulo}</strong>
                <small>{d.resumo}</small>
              </Link>
              <span className="v-lista-seta" aria-hidden="true">
                ›
              </span>
            </div>
          ))}
        </div>

        <section className="v-texto">
          <h2>Reclamações</h2>
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
          <p style={{ fontSize: '13px', color: 'var(--v-tinta-suave)' }}>
            {CCG.nome} · NIPC {CCG.nipc} · {CCG.morada} · {CCG.email} · {CCG.telefone}
          </p>
        </section>
      </div>
    </main>
  )
}
