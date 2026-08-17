import { afterEach, describe, expect, it, vi } from 'vitest'
import { validarDataDePresenca } from './presencas'

// 2026-08-17 é uma segunda-feira. As datas abaixo saem daí:
//   ago 12 = quarta   ago 17 = segunda (hoje)   ago 19 = quarta
const HOJE = new Date('2026-08-17T10:00:00Z')

afterEach(() => {
  vi.useRealTimers()
})

function comHoje<T>(f: () => T): T {
  vi.useFakeTimers()
  vi.setSystemTime(HOJE)
  return f()
}

describe('validarDataDePresenca', () => {
  it('aceita hoje, quando hoje é o dia do horário', () => {
    expect(comHoje(() => validarDataDePresenca('2026-08-17', 'Segunda'))).toBeNull()
  })

  it('aceita uma data passada no dia certo', () => {
    expect(comHoje(() => validarDataDePresenca('2026-08-10', 'Segunda'))).toBeNull()
  })

  // Marcar quem esteve numa aula que ainda não aconteceu não é um engano
  // de escrita — é registar presença numa aula que ninguém deu.
  it('recusa uma data futura', () => {
    expect(comHoje(() => validarDataDePresenca('2026-08-24', 'Segunda'))).toContain(
      'data futura'
    )
  })

  // Hoje não é futuro. É a fronteira que se engana com facilidade, e
  // errá-la impede o professor de marcar a aula que acabou de dar.
  it('hoje não conta como futuro', () => {
    expect(comHoje(() => validarDataDePresenca('2026-08-17', 'Segunda'))).toBeNull()
  })

  it('recusa uma data que não cai no dia do horário', () => {
    const erro = comHoje(() => validarDataDePresenca('2026-08-12', 'Segunda'))
    expect(erro).toContain('não é uma Segunda')
  })

  // A mensagem diz o dia do horário, não o dia da data. É essa a
  // informação de que o professor precisa para se corrigir.
  it('a mensagem nomeia o dia do horário', () => {
    expect(comHoje(() => validarDataDePresenca('2026-08-17', 'Quarta'))).toBe(
      'Essa data não é uma Quarta, o dia deste horário.'
    )
  })

  it('recusa uma data vazia', () => {
    expect(validarDataDePresenca('', 'Segunda')).toContain('Indica a data')
  })

  // A verificação do futuro vem antes da do dia da semana: uma data
  // futura no dia errado é, antes de tudo, futura.
  it('o futuro ganha ao dia errado', () => {
    expect(comHoje(() => validarDataDePresenca('2026-08-19', 'Segunda'))).toContain(
      'data futura'
    )
  })
})
