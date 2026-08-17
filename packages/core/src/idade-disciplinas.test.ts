import { describe, expect, it } from 'vitest'
import {
  MUSICA_IDADE_MAX,
  MUSICA_IDADE_MIN,
  dentroDaFaixa,
  elegivelParaDisciplina,
  parseFaixaEtaria,
  separarFaixaEtaria,
} from './idade-disciplinas'

describe('separarFaixaEtaria', () => {
  it('separa o título da faixa que vem entre parênteses', () => {
    expect(separarFaixaEtaria('Estilos Urbanos (6 aos 18 anos)')).toEqual({
      titulo: 'Estilos Urbanos',
      idade: '6 aos 18 anos',
    })
  })

  it('devolve o nome inteiro quando não há parênteses', () => {
    expect(separarFaixaEtaria('Piano')).toEqual({ titulo: 'Piano' })
  })

  // O padrão está ancorado ao fim da string, de propósito: um nome como
  // "Dança (avançado) para adultos" não deve perder o "para adultos".
  it('só separa parênteses no fim do nome', () => {
    expect(separarFaixaEtaria('Dança (avançado) para adultos')).toEqual({
      titulo: 'Dança (avançado) para adultos',
    })
  })
})

describe('parseFaixaEtaria', () => {
  it('lê os dois números da faixa', () => {
    expect(parseFaixaEtaria('6 aos 18 anos')).toEqual({ min: 6, max: 18 })
  })

  it('tolera espaçamento irregular', () => {
    expect(parseFaixaEtaria('6  aos  18 anos')).toEqual({ min: 6, max: 18 })
  })

  it('devolve null quando não há faixa nenhuma', () => {
    expect(parseFaixaEtaria(undefined)).toBeNull()
    expect(parseFaixaEtaria('adultos')).toBeNull()
  })
})

describe('dentroDaFaixa', () => {
  const faixa = { min: 6, max: 18 }

  it('inclui os dois extremos', () => {
    expect(dentroDaFaixa(6, faixa)).toBe(true)
    expect(dentroDaFaixa(18, faixa)).toBe(true)
  })

  it('exclui fora dos extremos', () => {
    expect(dentroDaFaixa(5, faixa)).toBe(false)
    expect(dentroDaFaixa(19, faixa)).toBe(false)
  })

  // Contas criadas antes de existir o campo da data de nascimento não têm
  // idade. Bloquear essas pessoas seria pior do que deixar passar: são
  // alunos reais que já frequentam a escola.
  it('não bloqueia quem não tem idade conhecida', () => {
    expect(dentroDaFaixa(null, faixa)).toBe(true)
  })

  it('não bloqueia quando a disciplina não declara faixa', () => {
    expect(dentroDaFaixa(30, null)).toBe(true)
  })
})

describe('elegivelParaDisciplina', () => {
  it('na dança, usa a faixa que vem no nome da modalidade', () => {
    const modalidade = 'Estilos Urbanos (6 aos 18 anos)'
    expect(elegivelParaDisciplina(10, 'danca', modalidade)).toBe(true)
    expect(elegivelParaDisciplina(20, 'danca', modalidade)).toBe(false)
  })

  // Na música para bebés a faixa está no próprio nome, sem título à frente
  // — o formato é diferente do da dança e por isso tem caminho próprio.
  it('nos bebés, lê a faixa do nome sem precisar de parênteses', () => {
    expect(elegivelParaDisciplina(2, 'bebes', '0 aos 3 anos')).toBe(true)
    expect(elegivelParaDisciplina(4, 'bebes', '0 aos 3 anos')).toBe(false)
  })

  it('na música, aplica o intervalo largo por omissão', () => {
    expect(elegivelParaDisciplina(MUSICA_IDADE_MIN, 'musica', 'Piano')).toBe(true)
    expect(elegivelParaDisciplina(MUSICA_IDADE_MAX, 'musica', 'Piano')).toBe(true)
    expect(elegivelParaDisciplina(MUSICA_IDADE_MIN - 1, 'musica', 'Piano')).toBe(false)
    expect(elegivelParaDisciplina(MUSICA_IDADE_MAX + 1, 'musica', 'Piano')).toBe(false)
  })

  it('trata programa desconhecido ou em falta como música', () => {
    expect(elegivelParaDisciplina(30, null, 'Piano')).toBe(true)
    expect(elegivelParaDisciplina(3, undefined, 'Piano')).toBe(false)
  })

  it('deixa passar quem não tem data de nascimento, em qualquer programa', () => {
    expect(elegivelParaDisciplina(null, 'danca', 'Estilos Urbanos (6 aos 18 anos)')).toBe(true)
    expect(elegivelParaDisciplina(null, 'musica', 'Piano')).toBe(true)
  })

  // Uma modalidade de dança sem faixa no nome não pode bloquear ninguém por
  // acidente — o parse falha e a regra tem de ficar permissiva.
  it('não bloqueia numa modalidade de dança sem faixa declarada', () => {
    expect(elegivelParaDisciplina(40, 'danca', 'Ballet Clássico')).toBe(true)
  })
})
