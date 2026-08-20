'use client'

import { useEffect, useRef } from 'react'
import { marcarNotificacaoLida } from '@/lib/actions/notificacoes'

// Abrir um aviso é lê-lo.
//
// Podia marcar-se do lado do servidor, ao desenhar a página — e estaria
// errado: o Next pré-carrega as ligações que aparecem no ecrã, e um
// aviso passava a lido só por a pessoa ter passado o dedo por cima dele
// na lista. Um efeito no cliente só corre quando a página é mesmo
// aberta.
//
// Falha em silêncio de propósito: se a marcação não passar, o pior que
// acontece é o aviso continuar a contar como novo. Não vale um erro no
// ecrã de quem só queria ler.
export function MarcarAvisoLido({ notificacaoId }: { notificacaoId: number }) {
  const jaFoi = useRef(false)

  useEffect(() => {
    // O React corre os efeitos duas vezes em desenvolvimento; sem esta
    // guarda eram dois pedidos para a mesma coisa.
    if (jaFoi.current) return
    jaFoi.current = true

    const dados = new FormData()
    dados.set('notificacaoId', String(notificacaoId))
    marcarNotificacaoLida(dados).catch(() => {})
  }, [notificacaoId])

  return null
}
