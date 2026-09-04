import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Download, LogIn } from 'lucide-react'
import { SimboloCCG } from '@/components/simbolo-ccg'
import { InterruptorTema } from '@/components/interruptor-tema'

// As três escolas. O `href` entra no assistente já com a escola
// escolhida, pelo que o passo de escolher escola é saltado — a idade é
// pedida logo a seguir, em pop-up. Os textos são os que já existiam.
const OFERTA = [
  {
    id: 'musica',
    nome: 'Música',
    detalhe: 'Piano · guitarra · canto · bateria',
    texto: 'Aprender a escutar, repetir e encontrar uma voz própria.',
    imagem: '/instrumentos/piano.png',
  },
  {
    id: 'danca',
    nome: 'Dança',
    detalhe: 'Ballet · contemporâneo · estilos urbanos',
    texto: 'Descobrir o corpo, o espaço e a expressão através do movimento.',
    imagem: '/instrumentos/ballet-classico.png',
  },
  {
    id: 'bebes',
    nome: 'Primeiros sons',
    detalhe: 'Música para bebés · 0 aos 5 anos',
    texto: 'Uma primeira relação com som, ritmo e criação em família.',
    imagem: '/instrumentos/bebes-0-3.png',
  },
] as const

// A porta de entrada de quem não tem conta.
//
// Substituiu um carrossel que rodava sozinho de cinco em cinco segundos e
// pedia um componente de cliente com temporizador e estado. As três
// escolas cabem as três no ecrã; mostrar uma de cada vez escondia duas
// terças partes da oferta e obrigava a esperar para as ver.
//
// O único JavaScript que aqui ficou é o interruptor de tema: precisa de
// ler o localStorage e de escrever no <html>, e nenhuma das duas coisas
// se faz no servidor.
export function PublicHomeExperience() {
  return (
    <main id="conteudo-principal" className="pinterest-publico">
      <nav className="pinterest-publico-topo" aria-label="Navegação principal">
        <Link
          href="/"
          className="pinterest-publico-marca"
          aria-label="Centro Cultural da Guarda — ir para o início"
        >
          <SimboloCCG />
          <small>Centro Cultural da Guarda</small>
        </Link>
        <div className="pinterest-publico-entrar">
          <Link href="/login">Entrar</Link>
          <Link href="/registo">Criar conta</Link>
        </div>
      </nav>

      {/* Numa linha só dele, por baixo do Entrar/Criar conta e alinhado
          à direita com eles. Na barra de cima não cabia: a 360px essa
          linha já anda no limite, e um terceiro controlo comia o nome
          do Centro. */}
      <div className="pinterest-publico-tema-linha">
        <InterruptorTema />
      </div>

      <header className="pinterest-publico-intro">
        <p>Escolas Artísticas</p>
        <h1>Onde começa uma prática.</h1>
        <span>
          Música, dança e primeiros sons, no Centro Cultural da Guarda. Escolhe uma
          escola e diz quando podes.
        </span>
      </header>

      <section className="pinterest-publico-seccao" aria-labelledby="publico-oferta">
        <h2 id="publico-oferta">O que queres aprender?</h2>
        <div className="pinterest-publico-escolas">
          {OFERTA.map((escola) => (
            <Link
              key={escola.id}
              href={`/pedir-aula?programa=${escola.id}`}
              className="pinterest-publico-escola"
            >
              <span className="pinterest-publico-escola-imagem">
                <Image src={escola.imagem} width={88} height={88} alt="" />
              </span>
              {/* Todo o texto dentro de um só filho da grelha. Solto, a
                  colocação automática mandava o nome para a coluna da
                  seta e a linha partia letra a letra. */}
              <span className="pinterest-publico-escola-texto">
                <strong>{escola.nome}</strong>
                <small>{escola.detalhe}</small>
                <p>{escola.texto}</p>
              </span>
              <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="pinterest-publico-seccao" aria-labelledby="publico-conta">
        <h2 id="publico-conta">Já tens conta?</h2>
        <div className="pinterest-publico-lista">
          <Link href="/login">
            <span>
              <LogIn size={19} strokeWidth={2} aria-hidden="true" />
            </span>
            <span>
              <strong>Entrar</strong>
              <small>Ver as aulas, os avisos e as mensalidades</small>
            </span>
            <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
          <Link href="/instalar">
            <span>
              <Download size={19} strokeWidth={2} aria-hidden="true" />
            </span>
            <span>
              <strong>Levar a aplicação contigo</strong>
              <small>Instalar no telemóvel, sem passar por uma loja</small>
            </span>
            <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <p className="pinterest-publico-assinatura">Pela Guarda, pela arte e pela cultura.</p>
    </main>
  )
}
