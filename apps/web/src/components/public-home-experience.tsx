'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { SimboloCCG } from '@/components/simbolo-ccg'
import { RodapeVitrine } from '@/components/rodape-vitrine'

// Página pública de entrada, na linguagem "vitrine" (Claude Design, 1a).
//
// Uma peça de cada vez, e não as três ao mesmo tempo: a escolha faz-se
// na cápsula de baixo, e o que está por cima é a consequência dela. A
// versão anterior mostrava uma colagem que rodava sozinha a cada 5
// segundos — dizia "olha para mim" mas não dizia "escolhe".
//
// Por isso também não há aqui rotação automática. Quem chega escolhe;
// nada se mexe sem alguém mandar.
const OFERTA = [
  {
    id: 'musica',
    nome: 'Música',
    detalhe: 'Piano · guitarra · canto · bateria',
    imagem: '/instrumentos/piano.png',
  },
  {
    id: 'danca',
    nome: 'Dança',
    detalhe: 'Ballet · contemporâneo · estilos urbanos',
    imagem: '/instrumentos/ballet-classico.png',
  },
  {
    id: 'bebes',
    nome: 'Primeiros sons',
    detalhe: 'Música para bebés · 0–5 anos',
    imagem: '/instrumentos/bebes-0-3.png',
  },
] as const

const PASSOS = [
  { titulo: 'Escolhes a direcção', detalhe: 'Música, dança ou primeiros sons.' },
  { titulo: 'Vês os horários livres', detalhe: 'A disponibilidade real dos professores.' },
  { titulo: 'Pedes a aula', detalhe: 'A secretaria confirma e ficas com conta.' },
]

export function PublicHomeExperience() {
  const [indice, setIndice] = useState(0)
  const activa = OFERTA[indice]

  return (
    <main id="conteudo-principal" className="v-pagina">
      <div className="v-folha">
        <div className="v-topo">
          <Link href="/" className="v-marca" aria-label="Centro Cultural da Guarda — ir para o início">
            <SimboloCCG />
            <span>Centro Cultural da Guarda</span>
          </Link>
          <Link href="/login" className="v-topo-saida">
            Entrar
          </Link>
        </div>

        <div style={{ padding: '38px 22px 0' }}>
          <p className="v-sobretitulo">Escolas artísticas</p>
          <h1 className="v-titulo">
            Onde começa
            <br />
            <em>uma prática.</em>
          </h1>
          <p className="v-entrada">
            Música, dança e primeiros sons na Guarda. Escolhe uma direcção e vê as aulas.
          </p>
        </div>

        <Link
          href={`/pedir-aula?programa=${activa.id}`}
          className="v-vitrine"
          aria-label={`Ver aulas de ${activa.nome}`}
        >
          <span className="v-vitrine-indice">0{indice + 1}</span>
          {/* As três ficam montadas e só a activa é visível: assim a
              troca é um esbatimento e não um pedido à rede a meio de um
              toque. A primeira carrega com prioridade porque é ela que
              está à vista quando a página abre. */}
          {OFERTA.map((item, i) => (
            <Image
              key={item.id}
              src={item.imagem}
              alt=""
              width={270}
              height={270}
              priority={i === 0}
              data-ativa={i === indice}
            />
          ))}
          <span className="v-vitrine-legenda">
            <strong>{activa.nome}</strong>
            <span>{activa.detalhe}</span>
          </span>
        </Link>

        <div className="v-chips" role="group" aria-label="Escolas artísticas">
          {OFERTA.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={i === indice}
              onClick={() => setIndice(i)}
            >
              {item.nome}
            </button>
          ))}
        </div>

        <div className="v-seccao">
          <p className="v-sobretitulo">02 Como começa</p>
          <h2>Três passos, cinco minutos.</h2>
        </div>

        <div className="v-passos">
          <ol>
            {PASSOS.map((passo) => (
              <li key={passo.titulo}>
                <strong>{passo.titulo}</strong>
                <span>{passo.detalhe}</span>
              </li>
            ))}
          </ol>
        </div>

        <Link href="/instalar" className="v-cartao-linha">
          <i>
            <SimboloCCG />
          </i>
          <div>
            <strong>Levar a aplicação contigo</strong>
            <small>Instalar no telemóvel, sem loja.</small>
          </div>
          <span aria-hidden="true">›</span>
        </Link>

        <RodapeVitrine lema="Pela Guarda, pela arte e pela cultura." />
      </div>

      <div className="v-capsula">
        <span className="v-capsula-texto">
          <small>{activa.nome}</small>
          <strong>Pedir uma aula</strong>
        </span>
        <Link href={`/pedir-aula?programa=${activa.id}`} className="v-capsula-accao">
          Começar
        </Link>
      </div>
    </main>
  )
}
