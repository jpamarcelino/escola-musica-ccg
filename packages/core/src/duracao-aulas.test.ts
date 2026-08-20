import { describe, expect, it } from 'vitest'
import {
  DURACAO_AULA,
  duracaoDaAula,
  minutosEntre,
  professorCriaHorarios,
} from './duracao-aulas'

describe('DURACAO_AULA', () => {
  it('tem a duração de cada escola', () => {
    expect(DURACAO_AULA).toEqual({ musica: 45, danca: 50, bebes: 60 })
  })
})

describe('duracaoDaAula', () => {
  it('devolve os minutos da escola', () => {
    expect(duracaoDaAula('musica')).toBe(45)
    expect(duracaoDaAula('danca')).toBe(50)
    expect(duracaoDaAula('bebes')).toBe(60)
  })

  it('devolve null para quem não tem escola', () => {
    expect(duracaoDaAula(null)).toBeNull()
    expect(duracaoDaAula('teatro')).toBeNull()
  })
})

describe('professorCriaHorarios', () => {
  it('é a secretaria quem monta a grelha de bebés', () => {
    expect(professorCriaHorarios('bebes')).toBe(false)
    expect(professorCriaHorarios('musica')).toBe(true)
    expect(professorCriaHorarios('danca')).toBe(true)
  })
})

describe('minutosEntre', () => {
  it('conta os minutos', () => {
    expect(minutosEntre('17:10', '18:00')).toBe(50)
    expect(minutosEntre('10:00:00', '10:45:00')).toBe(45)
  })

  it('devolve null com horas mal formadas', () => {
    expect(minutosEntre('', '10:00')).toBeNull()
  })
})
