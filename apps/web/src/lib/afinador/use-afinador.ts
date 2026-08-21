'use client'

// O estado do afinador: liga, analisa, desliga e — sobretudo — garante
// que o microfone não fica ligado por engano.
//
// Chama-se "useAfinador" e não "usarAfinador", ao contrário do resto do
// código, que é todo em português: o prefixo "use" faz parte do contrato
// do React, e é por ele que as regras de hooks e a verificação de
// dependências reconhecem a função. Traduzir o nome desligava-as.
//
// Toda a lógica de sinal está em @ccg/core e toda a conversa com o
// browser está no microfone.ts. Aqui só se coordenam os dois e se trata
// do ciclo de vida, que é onde moram os problemas reais: o separador que
// vai para segundo plano, o ecrã que se apaga, a chamada que entra, o
// componente que é desmontado a meio.

import { useCallback, useEffect, useRef, useState } from 'react'
import { criarEstabilizador, detetarTom, A4_PADRAO } from '@ccg/core'
import type { Estabilizador, SaidaAfinador } from '@ccg/core'
import {
  abrirMicrofone,
  ambienteDoBrowser,
  suportado,
  FalhaDoMicrofone,
  TAMANHO_BLOCO,
  type AmbienteAudio,
  type Captura,
  type ErroMicrofone,
} from './microfone'

// Vinte análises por segundo. O detetor leva menos de meio milissegundo
// por análise num portátil e uns poucos num telemóvel, por isso o limite
// não é o cálculo — é que atualizar o ecrã muito mais depressa do que
// isto não se lê, e ainda faz a agulha parecer nervosa.
const INTERVALO_MS = 50

export type FaseAfinador =
  | { fase: 'parado'; motivoDaParagem?: 'segundo-plano' | 'interrompido' }
  | { fase: 'a-pedir' }
  | { fase: 'erro'; motivo: ErroMicrofone }
  | { fase: 'ativo'; saida: SaidaAfinador }

/**
 * O `ambiente` é o ponto por onde se substitui o browser.
 *
 * Em produção fica por preencher e usa-se o microfone a sério. Existe
 * porque foi assim que este afinador foi verificado antes de ser dado
 * por feito: alimentado com um MediaStream gerado a partir de um
 * oscilador, atravessando o AudioContext e o AnalyserNode verdadeiros,
 * com só o getUserMedia trocado. Sem esta costura, a única forma de
 * experimentar a cadeia completa era à mão, com um instrumento.
 */
export function useAfinador(opcoes: { a4?: number; ambiente?: AmbienteAudio } = {}) {
  const [fase, setFase] = useState<FaseAfinador>({ fase: 'parado' })

  const capturaRef = useRef<Captura | null>(null)
  const temporizadorRef = useRef<number | null>(null)
  const blocoRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(TAMANHO_BLOCO))
  const estabilizadorRef = useRef<Estabilizador | null>(null)
  const a4Ref = useRef(opcoes.a4 ?? A4_PADRAO)

  useEffect(() => {
    a4Ref.current = opcoes.a4 ?? A4_PADRAO
  }, [opcoes.a4])

  // Uma só porta de saída, usada por tudo: o botão, o segundo plano, a
  // interrupção do sistema e a desmontagem. Ter várias formas de parar é
  // como se deixa um microfone ligado.
  const desligar = useCallback(() => {
    if (temporizadorRef.current !== null) {
      window.clearInterval(temporizadorRef.current)
      temporizadorRef.current = null
    }
    capturaRef.current?.parar()
    capturaRef.current = null
    estabilizadorRef.current = null
  }, [])

  const parar = useCallback(() => {
    desligar()
    setFase({ fase: 'parado' })
  }, [desligar])

  const iniciar = useCallback(async () => {
    const ambiente = opcoes.ambiente ?? ambienteDoBrowser()
    if (!suportado(ambiente)) {
      setFase({ fase: 'erro', motivo: 'sem-suporte' })
      return
    }

    desligar()
    setFase({ fase: 'a-pedir' })

    let captura: Captura
    try {
      captura = await abrirMicrofone(ambiente)
    } catch (erro) {
      setFase({
        fase: 'erro',
        motivo: erro instanceof FalhaDoMicrofone ? erro.motivo : 'desconhecido',
      })
      return
    }

    captura.aoInterromper(() => {
      desligar()
      setFase({ fase: 'parado', motivoDaParagem: 'interrompido' })
    })

    capturaRef.current = captura
    estabilizadorRef.current = criarEstabilizador()
    setFase({ fase: 'ativo', saida: { tipo: 'a-ouvir' } })

    temporizadorRef.current = window.setInterval(() => {
      const c = capturaRef.current
      const est = estabilizadorRef.current
      if (!c || !est) return
      const bloco = blocoRef.current
      // O mesmo array a cada volta, preenchido por cima. Não se acumula
      // áudio nenhum: o bloco anterior deixa de existir no instante em
      // que o seguinte é escrito.
      c.ler(bloco)
      const leitura = detetarTom(bloco, c.taxaAmostragem)
      const saida = est.registar(leitura, performance.now(), a4Ref.current)
      setFase({ fase: 'ativo', saida })
    }, INTERVALO_MS)
  }, [desligar, opcoes.ambiente])

  // Ir para segundo plano ou apagar o ecrã liberta o microfone. É a
  // diferença entre uma ferramenta e um problema de privacidade: nenhum
  // utilizador espera que o afinador continue a ouvir com o telemóvel no
  // bolso, e no iOS o contexto é suspenso na mesma — ficaria "ligado" a
  // não fazer nada.
  useEffect(() => {
    function aoEsconder() {
      if (document.visibilityState !== 'hidden') return
      if (!capturaRef.current) return
      desligar()
      setFase({ fase: 'parado', motivoDaParagem: 'segundo-plano' })
    }
    document.addEventListener('visibilitychange', aoEsconder)
    window.addEventListener('pagehide', aoEsconder)
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder)
      window.removeEventListener('pagehide', aoEsconder)
    }
  }, [desligar])

  // Sair do separador, mudar de página, fechar o caderno: desliga.
  useEffect(() => desligar, [desligar])

  return {
    fase,
    iniciar,
    parar,
    aOuvir: fase.fase === 'ativo' || fase.fase === 'a-pedir',
  }
}
