import { describe, expect, it } from 'vitest'
import { DESTINO_PREDEFINIDO, destinoSeguro } from './destino-seguro'

describe('destinoSeguro', () => {
  it('deixa passar caminhos internos', () => {
    expect(destinoSeguro('/dashboard')).toBe('/dashboard')
    expect(destinoSeguro('/redefinir-password')).toBe('/redefinir-password')
    expect(destinoSeguro('/aluno/123/horario?ver=semana')).toBe('/aluno/123/horario?ver=semana')
  })

  it('recusa moradas noutro dominio', () => {
    for (const fora of [
      'https://exemplo-externo.invalid',
      'http://exemplo-externo.invalid',
      '//exemplo-externo.invalid',
      'exemplo-externo.invalid',
    ]) {
      expect(destinoSeguro(fora), fora).toBe(DESTINO_PREDEFINIDO)
    }
  })

  it('recusa as barras invertidas que os browsers leem como //', () => {
    // O Chrome trata `/\` e `/\/` como o principio de um host. Uma
    // verificacao que so olhasse para `//` deixava isto passar.
    expect(destinoSeguro('/\\exemplo-externo.invalid')).toBe(DESTINO_PREDEFINIDO)
    expect(destinoSeguro('/\\/exemplo-externo.invalid')).toBe(DESTINO_PREDEFINIDO)
  })

  it('recusa esquemas que executam codigo', () => {
    expect(destinoSeguro('javascript:alert(1)')).toBe(DESTINO_PREDEFINIDO)
    expect(destinoSeguro('data:text/html,<script>')).toBe(DESTINO_PREDEFINIDO)
  })

  it('aguenta vazio, nulo e indefinido', () => {
    expect(destinoSeguro('')).toBe(DESTINO_PREDEFINIDO)
    expect(destinoSeguro(null)).toBe(DESTINO_PREDEFINIDO)
    expect(destinoSeguro(undefined)).toBe(DESTINO_PREDEFINIDO)
  })
})
