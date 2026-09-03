import Link from 'next/link'
import { MarcarAvisoLido } from '@/components/marcar-aviso-lido'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { VoltarAtras } from '@/components/voltar-atras'

// Um aviso, sozinho na sua página.
//
// A lista serve para varrer: data, uma linha ou duas, e seguir. Não
// serve para ler — uma mensagem escrita à mão pode ter mil caracteres, e
// numa linha de lista isso fica espremido contra a data de um lado e o
// resto do arquivo do outro.
//
// Aqui a mensagem tem a largura toda, o texto respeita os parágrafos que
// quem escreveu lhe deu, e o sítio onde se age sobre o aviso — quando
// existe — está em baixo, onde se chega depois de ler e não antes.
//
// O mesmo corpo serve a família e a secretaria: muda o caminho de volta
// e a etiqueta de cima, que são props.
export function AvisoDetalhe({
  id,
  sobretitulo,
  titulo,
  mensagem,
  criadoEm,
  lida,
  accao,
  voltarPara,
  variante = 'partitura',
  classePagina = '',
}: {
  id: number
  sobretitulo: string
  titulo: string
  mensagem: string
  criadoEm: string
  lida: boolean
  accao: { href: string; texto: string } | null
  voltarPara: string
  variante?: 'partitura' | 'pinterest'
  classePagina?: string
}) {
  const data = new Date(criadoEm)
  const pinterest = variante === 'pinterest'

  return (
    <main id="conteudo-principal" className={`${pinterest ? 'pinterest-aviso' : 'partitura-pagina aviso-pagina'} ${classePagina}`.trim()}>
      <div className={pinterest ? 'pinterest-aviso-folha' : 'partitura-folha'}>
        <header className={pinterest ? 'pinterest-aviso-cabecalho' : 'partitura-agenda-cabecalho'}>
          <VoltarAtras destino={voltarPara} className={pinterest ? 'pinterest-aviso-voltar' : 'partitura-voltar'} rotulo="Voltar aos avisos">{pinterest ? <ChevronLeft size={23} aria-hidden="true" /> : '←'}</VoltarAtras>
          <div>
            <p className="partitura-sobretitulo">{sobretitulo}</p>
            <h1>{titulo}</h1>
            <p>
              <time dateTime={data.toISOString()}>
                {new Intl.DateTimeFormat('pt-PT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(data)}
              </time>
            </p>
          </div>
        </header>

        {/* pre-wrap: quem escreveu a mensagem pode ter deixado
            parágrafos, e uma mensagem de boas festas escrita em três
            blocos não pode chegar como um bloco só. */}
        <article className="aviso-corpo">{mensagem}</article>

        {accao && (
          <Link href={accao.href} className="aviso-accao">
            <span>{accao.texto}</span>{pinterest && <ChevronRight size={19} aria-hidden="true" />}
          </Link>
        )}

        {!lida && <MarcarAvisoLido notificacaoId={id} />}
      </div>
    </main>
  )
}
