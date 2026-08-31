import Link from 'next/link'
import { RodapeVitrine } from '@/components/rodape-vitrine'

// Casca dos passos do pedido público, na linguagem vitrine.
//
// Fica ao lado do Wizard antigo, que continua a servir o percurso
// autenticado (/aluno/[alunoId]/pedido). Migrar os dois de uma vez
// obrigava a mexer num ecrã que este design não desenhou — e o resultado
// seria eu a inventar metade.
export function WizardVitrine({
  passo,
  totalPassos = 5,
  titulo,
  entrada,
  voltar,
  resumo,
  mudarHref,
  children,
}: {
  passo?: number
  totalPassos?: number
  titulo: string
  entrada?: string
  voltar: string
  // O que já ficou decidido, numa linha só, na cápsula: "Música · 8 anos".
  // O assistente pedia a idade ao início e nunca mais a mostrava — quem se
  // enganava só descobria no fim.
  resumo?: string
  mudarHref?: string
  children: React.ReactNode
}) {
  return (
    <main id="conteudo-principal" className="v-pagina">
      <div className="v-folha">
        <div className="v-passo-topo">
          <Link href={voltar} className="v-voltar" aria-label="Voltar">
            ‹
          </Link>
          <p className="v-sobretitulo">
            Pedir uma aula
            {passo ? ` · Passo ${passo} de ${totalPassos}` : ''}
          </p>
        </div>

        {passo && (
          <ol className="v-progresso" aria-label={`Passo ${passo} de ${totalPassos}`}>
            {Array.from({ length: totalPassos }, (_, i) => (
              <li
                key={i}
                data-estado={i + 1 < passo ? 'feito' : i + 1 === passo ? 'atual' : 'por-fazer'}
                aria-hidden="true"
              />
            ))}
          </ol>
        )}

        <h1 className="v-passo-titulo">{titulo}</h1>
        {entrada && <p className="v-passo-entrada">{entrada}</p>}

        {children}

        <RodapeVitrine />
      </div>

      {resumo && (
        <div className="v-capsula">
          <span className="v-ponto" aria-hidden="true" />
          <span className="v-capsula-texto">
            <small className="v-capsula-etiqueta">Até agora</small>
            <strong style={{ fontWeight: 500, fontSize: '14.5px' }}>{resumo}</strong>
          </span>
          {mudarHref && (
            <Link href={mudarHref} className="v-capsula-secundaria">
              Mudar
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
