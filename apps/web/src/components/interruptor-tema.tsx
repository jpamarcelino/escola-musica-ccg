'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import {
  aplicarAparencia,
  guardarAparencia,
  lerAparencia,
  resolverAparencia,
} from '@/lib/aparencia'

// O interruptor de tema da porta de entrada.
//
// Duas posições e não três: o seletor de dentro da app tem Claro, Escuro
// e Sistema, e aqui não há sítio para um terceiro estado nem paciência
// de quem chega para o decidir. O interruptor mostra o tema QUE ESTÁ EM
// VIGOR — se o aparelho está em escuro, chega com a lua acesa — e mexer
// nele grava uma escolha explícita. Deixa-se de seguir o sistema, que é
// exatamente o que se está a pedir ao carregar. Quem quiser voltar a
// "Sistema" tem essa opção na conta, com esse nome.
//
// A chave é a mesma (`ccg-aparencia`, no aparelho e não na conta), pelo
// que a escolha feita aqui, antes sequer de haver conta, ainda lá está
// depois de entrar.
export function InterruptorTema() {
  // Começa em claro e não no valor guardado: o servidor não sabe o que
  // está no localStorage, e ler no primeiro render daria HTML diferente
  // do do servidor. O valor certo entra no efeito, já no browser — e
  // `montado` segura a animação para o botão não deslizar sozinho
  // assim que a página abre.
  const [escuro, setEscuro] = useState(false)
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setEscuro(resolverAparencia(lerAparencia()) === 'escuro')
    setMontado(true)
  }, [])

  // Enquanto ninguém mexeu no interruptor, a escolha guardada continua a
  // ser "sistema": se o telemóvel passar a escuro ao anoitecer com a
  // página aberta, o interruptor tem de acompanhar.
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const aoMudar = () => {
      if (lerAparencia() !== 'sistema') return
      aplicarAparencia('sistema')
      setEscuro(consulta.matches)
    }
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  function alternar() {
    const novo = escuro ? 'claro' : 'escuro'
    setEscuro(!escuro)
    guardarAparencia(novo)
    aplicarAparencia(novo)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={escuro}
      aria-label="Tema escuro"
      onClick={alternar}
      className="pinterest-publico-tema"
      data-montado={montado ? '' : undefined}
    >
      {/* Os dois símbolos estão sempre à vista, um de cada lado: é o que
          diz que isto tem duas posições e para onde vai a seguir. A
          pastilha desliza por cima do que está em vigor. */}
      <span className="pinterest-publico-tema-pastilha" aria-hidden="true" />
      <Sun size={15} strokeWidth={2.2} aria-hidden="true" />
      <Moon size={15} strokeWidth={2.2} aria-hidden="true" />
    </button>
  )
}
