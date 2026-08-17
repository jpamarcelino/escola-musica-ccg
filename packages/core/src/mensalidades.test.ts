import { describe, expect, it } from 'vitest'
import {
  ROTULO_MENSALIDADE,
  estadoMensalidade,
  totalPorReceber,
  type EstadoMensalidade,
} from './mensalidades'

const base = { desistencia: false, beneficio_id: null, pago: false }

describe('estadoMensalidade', () => {
  it('sem linha, ainda não foi gerada', () => {
    expect(estadoMensalidade(null)).toBe('por_gerar')
    expect(estadoMensalidade(undefined)).toBe('por_gerar')
  })

  it('por pagar é o caso comum', () => {
    expect(estadoMensalidade(base)).toBe('por_pagar')
  })

  it('paga quando está paga', () => {
    expect(estadoMensalidade({ ...base, pago: true })).toBe('paga')
  })

  it('não devida quando uma recomendação a cobriu', () => {
    expect(estadoMensalidade({ ...base, beneficio_id: 7 })).toBe('nao_devida')
  })

  it('desistência quando o aluno desistiu', () => {
    expect(estadoMensalidade({ ...base, desistencia: true })).toBe('desistencia')
  })

  // A ordem das verificações é a regra, e é o que se estraga sem dar erro.
  // Cada um destes casos tem dois campos verdadeiros ao mesmo tempo; se a
  // ordem trocar, aparece "por pagar" a quem não deve nada.
  describe('ordem de precedência', () => {
    it('desistência ganha ao benefício', () => {
      expect(estadoMensalidade({ ...base, desistencia: true, beneficio_id: 7 })).toBe(
        'desistencia'
      )
    })

    it('desistência ganha a paga', () => {
      expect(estadoMensalidade({ ...base, desistencia: true, pago: true })).toBe('desistencia')
    })

    it('benefício ganha a paga', () => {
      expect(estadoMensalidade({ ...base, beneficio_id: 7, pago: true })).toBe('nao_devida')
    })

    it('desistência ganha aos dois ao mesmo tempo', () => {
      expect(
        estadoMensalidade({ desistencia: true, beneficio_id: 7, pago: true })
      ).toBe('desistencia')
    })
  })

  // beneficio_id = 0 é um id válido no Postgres. Um teste `if (beneficio_id)`
  // em vez de `!== null` mandava essa mensalidade para "por pagar".
  it('trata o benefício 0 como benefício e não como ausência', () => {
    expect(estadoMensalidade({ ...base, beneficio_id: 0 })).toBe('nao_devida')
  })
})

describe('ROTULO_MENSALIDADE', () => {
  it('tem palavras para todos os estados', () => {
    const estados: EstadoMensalidade[] = [
      'por_gerar',
      'desistencia',
      'nao_devida',
      'paga',
      'por_pagar',
    ]
    for (const e of estados) {
      expect(ROTULO_MENSALIDADE[e], e).toBeTruthy()
    }
  })
})

describe('totalPorReceber', () => {
  it('soma apenas o que está por pagar', () => {
    expect(
      totalPorReceber([
        { estado: 'por_pagar', valor: 30 },
        { estado: 'por_pagar', valor: 25.5 },
        { estado: 'paga', valor: 30 },
        { estado: 'nao_devida', valor: 30 },
        { estado: 'desistencia', valor: 30 },
        { estado: 'por_gerar', valor: 30 },
      ])
    ).toBe(55.5)
  })

  // Uma mensalidade por pagar sem valor definido não é 30 € nem é erro —
  // é uma ausência, e somar zero é a única coisa honesta a fazer.
  it('conta como zero uma mensalidade sem valor', () => {
    expect(totalPorReceber([{ estado: 'por_pagar', valor: null }])).toBe(0)
  })

  it('devolve zero numa lista vazia', () => {
    expect(totalPorReceber([])).toBe(0)
  })
})
