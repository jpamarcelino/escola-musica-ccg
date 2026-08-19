'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SimboloCCG } from '@/components/simbolo-ccg'

const OFERTA = [
  { id: 'musica', nome: 'Música', detalhe: 'Piano · guitarra · canto · bateria', texto: 'Aprender a escutar, repetir e encontrar uma voz própria.', imagens: ['/instrumentos/piano.png', '/instrumentos/guitarra.png', '/instrumentos/bateria.png'] },
  { id: 'danca', nome: 'Dança', detalhe: 'Ballet · contemporâneo · estilos urbanos', texto: 'Descobrir o corpo, o espaço e a expressão através do movimento.', imagens: ['/instrumentos/ballet-classico.png', '/instrumentos/danca-contemporanea.png', '/instrumentos/estilos-urbanos.png'] },
  { id: 'bebes', nome: 'Primeiros sons', detalhe: 'Música para bebés · 0–5 anos', texto: 'Uma primeira relação com som, ritmo e criação em família.', imagens: ['/instrumentos/bebes-0-3.png', '/instrumentos/bebes-3-5.png'] },
] as const

export function PublicHomeExperience() {
  const [ativa, setAtiva] = useState<(typeof OFERTA)[number]['id']>('musica')
  const [pausado, setPausado] = useState(false)
  const selecionada = OFERTA.find((item) => item.id === ativa) ?? OFERTA[0]
  const indiceAtivo = OFERTA.findIndex((item) => item.id === ativa)

  useEffect(() => {
    if (pausado || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const intervalo = window.setInterval(() => {
      setAtiva((atual) => {
        const indice = OFERTA.findIndex((item) => item.id === atual)
        return OFERTA[(indice + 1) % OFERTA.length].id
      })
    }, 5200)
    return () => window.clearInterval(intervalo)
  }, [pausado])

  function mover(direcao: -1 | 1) {
    setPausado(true)
    setAtiva(OFERTA[(indiceAtivo + direcao + OFERTA.length) % OFERTA.length].id)
  }

  return (
    <main id="conteudo-principal" className={`publico-vivo publico-vivo-${ativa}`}>
      <nav className="publico-vivo-nav" aria-label="Navegação principal">
        {/* Também aqui é ligação, e não texto: quem desce a home e quer
            recomeçar do topo procura a marca, e nas outras páginas ela
            leva ao início — se aqui não fizesse nada, a regra deixava de
            valer justamente onde se aprende. */}
        <Link href="/" className="publico-vivo-marca" aria-label="Centro Cultural da Guarda — ir para o início"><SimboloCCG /><small>Centro Cultural da Guarda</small></Link>
        <div><Link href="/login">Entrar</Link><Link href="/registo">Criar conta</Link></div>
      </nav>

      <section className="publico-vivo-hero" aria-labelledby="publico-vivo-titulo">
        <div className="publico-vivo-intro">
          <p>Centro Cultural da Guarda</p>
          <h1 id="publico-vivo-titulo">Onde começa<br/><em>uma prática.</em></h1>
          <span>Escolhe uma direção. A página acompanha a tua descoberta.</span>
        </div>

        <Link href={`/pedir-aula?programa=${selecionada.id}`} className="publico-vivo-visual" aria-label={`Ver aulas de ${selecionada.nome}`}>
          <span className="publico-vivo-visual-indice">0{indiceAtivo + 1}</span>
          <div className="publico-vivo-colagem" key={selecionada.id} aria-hidden="true">
            {selecionada.imagens.map((imagem, indice) => <Image key={imagem} src={imagem} width={230} height={230} alt="" priority={indice === 0} className={`publico-vivo-imagem publico-vivo-imagem-${indice + 1}`} />)}
          </div>
          <div className="publico-vivo-visual-texto" aria-live="polite"><strong>{selecionada.nome}</strong><p>{selecionada.detalhe}</p><span>Ver tipos de aula <i aria-hidden="true">↗</i></span></div>
        </Link>

        <div className="publico-vivo-escolha">
          <p>O que queres descobrir?</p>
          <div aria-label="Oferta artística">
            {OFERTA.map((item) => {
              const selecionado = item.id === ativa
              return (
                <Link key={item.id} href={`/pedir-aula?programa=${item.id}`} aria-current={selecionado ? 'true' : undefined} onMouseEnter={() => setAtiva(item.id)} onFocus={() => setAtiva(item.id)}>
                  <span>{item.nome}</span><small>Ver aulas</small>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="publico-vivo-reveal" key={selecionada.id}>
          <p>{selecionada.texto}</p>
          <div className="publico-vivo-controlos" aria-label="Controlos do carrossel"><button type="button" onClick={() => mover(-1)} aria-label="Anterior">←</button><span>{indiceAtivo + 1} / {OFERTA.length}</span><button type="button" onClick={() => mover(1)} aria-label="Seguinte">→</button><button type="button" onClick={() => setPausado((valor) => !valor)}>{pausado ? 'Retomar' : 'Pausar'}</button></div>
        </div>
      </section>

      <footer className="publico-vivo-rodape"><p>Pela Guarda, pela arte e pela cultura.</p><Link href="/instalar">Levar a aplicação contigo</Link></footer>
    </main>
  )
}
