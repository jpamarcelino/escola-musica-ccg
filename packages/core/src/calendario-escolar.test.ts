import { describe, expect, it } from 'vitest'
import {
  ANO_LETIVO_FIM,
  ANO_LETIVO_INICIO,
  diasDeAulas,
  domingoDePascoa,
  ehDiaDeAulas,
  estadoDoDia,
  feriados,
  mesesDoCalendario,
} from './calendario-escolar'

describe('domingoDePascoa', () => {
  it('acerta nos anos conhecidos', () => {
    expect(domingoDePascoa(2026)).toBe('2026-04-05')
    expect(domingoDePascoa(2027)).toBe('2027-03-28')
    expect(domingoDePascoa(2030)).toBe('2030-04-21')
  })
})

describe('feriados', () => {
  it('deriva os móveis da Páscoa', () => {
    const de2027 = feriados(2027)
    expect(de2027.get('2027-03-26')).toBe('Sexta-feira Santa')
    expect(de2027.get('2027-05-27')).toBe('Corpo de Deus')
  })

  it('inclui o feriado municipal da Guarda', () => {
    expect(feriados(2026).get('2026-11-27')).toBe('Feriado municipal da Guarda')
  })
})

describe('ano letivo', () => {
  it('começa a 1 de outubro, que é dia útil', () => {
    expect(ANO_LETIVO_INICIO).toBe('2026-10-01')
  })

  it('acaba a 30 de junho, que é dia útil', () => {
    expect(ANO_LETIVO_FIM).toBe('2027-06-30')
  })
})

describe('estadoDoDia', () => {
  it('põe setembro e agosto fora do ano letivo', () => {
    expect(estadoDoDia('2026-09-15').estado).toBe('fora_do_ano')
    expect(estadoDoDia('2027-07-01').estado).toBe('fora_do_ano')
  })

  it('distingue fim de semana de feriado', () => {
    expect(estadoDoDia('2026-10-03').estado).toBe('fim_de_semana')
    expect(estadoDoDia('2026-12-25')).toEqual({
      data: '2026-12-25',
      estado: 'feriado',
      motivo: 'Natal',
    })
  })

  it('trata os dias normais como dias de aulas', () => {
    expect(ehDiaDeAulas('2026-10-01')).toBe(true)
    expect(ehDiaDeAulas('2026-12-25')).toBe(false)
  })
})

describe('diasDeAulas', () => {
  const dias = diasDeAulas()

  it('fica dentro do ano letivo', () => {
    expect(dias[0]).toBe(ANO_LETIVO_INICIO)
    expect(dias[dias.length - 1]).toBe(ANO_LETIVO_FIM)
  })

  it('não inclui feriados nem fins de semana', () => {
    expect(dias).not.toContain('2026-12-25')
    expect(dias).not.toContain('2026-10-03')
  })
})

describe('mesesDoCalendario', () => {
  const meses = mesesDoCalendario()

  it('vai de setembro de 2026 a agosto de 2027', () => {
    expect(meses).toHaveLength(12)
    expect(meses[0]).toMatchObject({ ano: 2026, mes: 9, label: 'Setembro' })
    expect(meses[11]).toMatchObject({ ano: 2027, mes: 8, label: 'Agosto' })
  })

  it('alinha as semanas à segunda-feira', () => {
    // 1 de outubro de 2026 é uma quinta: três casas vazias antes.
    const outubro = meses.find((m) => m.mes === 10)!
    expect(outubro.semanas[0].slice(0, 3)).toEqual([null, null, null])
    expect(outubro.semanas[0][3]?.data).toBe('2026-10-01')
  })

  it('conta cada dia do mês uma só vez', () => {
    const outubro = meses.find((m) => m.mes === 10)!
    const dias = outubro.semanas.flat().filter(Boolean)
    expect(dias).toHaveLength(31)
  })
})
