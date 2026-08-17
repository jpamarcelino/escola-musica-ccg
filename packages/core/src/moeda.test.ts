import { describe, expect, it } from 'vitest'
import { euros, eurosOuTexto, eurosParaInput } from './moeda'

// O Intl usa espaço INQUEBRÁVEL (U+00A0) antes do € e entre milhares, não
// o espaço normal. Escrito à mão nos testes ficava invisível e a falha
// lia-se como "12,50 € !== 12,50 €", que não ajuda ninguém.
const NBSP = '\u00A0'

describe('euros', () => {
  it('usa vírgula decimal e o símbolo à direita, como em português', () => {
    expect(euros(12.5)).toBe(`12,50${NBSP}€`)
  })

  it('mostra sempre duas casas decimais', () => {
    expect(euros(12)).toBe(`12,00${NBSP}€`)
    expect(euros(12.4)).toBe(`12,40${NBSP}€`)
  })

  it('arredonda a metade acima', () => {
    expect(euros(12.345)).toBe(`12,35${NBSP}€`)
    expect(euros(0.005)).toBe(`0,01${NBSP}€`)
  })

  it('formata zero como quantia e não como vazio', () => {
    expect(euros(0)).toBe(`0,00${NBSP}€`)
  })

  it('mantém o sinal nos valores negativos (estornos)', () => {
    expect(euros(-3.2)).toBe(`-3,20${NBSP}€`)
  })

  // Em pt-PT o agrupamento só entra a partir de cinco dígitos — "1234,57 €"
  // e não "1 234,57 €". Fica aqui registado porque parece um erro quando se
  // vê pela primeira vez num total anual.
  it('não agrupa milhares em números de quatro dígitos', () => {
    expect(euros(1234.567)).toBe(`1234,57${NBSP}€`)
  })

  it('agrupa a partir dos cinco dígitos', () => {
    expect(euros(12345)).toBe(`12${NBSP}345,00${NBSP}€`)
  })
})

describe('eurosOuTexto', () => {
  // A razão de existir desta função: uma mensalidade sem valor definido
  // não é zero euros. Mostrar "0,00 €" seria afirmar algo falso.
  it('devolve a alternativa quando o valor não existe', () => {
    expect(eurosOuTexto(null, 'Por definir')).toBe('Por definir')
    expect(eurosOuTexto(undefined, 'Por definir')).toBe('Por definir')
  })

  it('formata zero como quantia, porque zero é um valor', () => {
    expect(eurosOuTexto(0, 'Por definir')).toBe(`0,00${NBSP}€`)
  })

  it('formata normalmente quando há valor', () => {
    expect(eurosOuTexto(30, 'Por definir')).toBe(`30,00${NBSP}€`)
  })
})

describe('eurosParaInput', () => {
  // Dentro de <input type="number"> o valor tem de levar ponto decimal e
  // não pode levar símbolo — senão o browser rejeita-o e o campo aparece
  // vazio ao editar uma mensalidade que já tinha valor.
  it('usa ponto decimal e não põe símbolo', () => {
    expect(eurosParaInput(12.5)).toBe('12.50')
    expect(eurosParaInput(30)).toBe('30.00')
  })

  it('não agrupa milhares, que o input não aceitaria', () => {
    expect(eurosParaInput(12345.6)).toBe('12345.60')
  })
})
