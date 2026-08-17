import { afterEach, describe, expect, it, vi } from 'vitest'
import { MESES_ANO_LETIVO, rotuloMes } from './ano-letivo'
import { DIAS_SEMANA } from './dias-semana'
import { HOUR_HEIGHT, formatarHora, paraMinutos } from './horarios-grade'
import { calcularIdade } from './idade'
import { palavra, plural } from './plural'
import { formatarSala } from './sala'

afterEach(() => {
  vi.useRealTimers()
})

describe('DIAS_SEMANA', () => {
  // Vários módulos indexam este array pela posição — datas.ts converte o
  // getDay() do JavaScript para esta ordem. Trocar a ordem aqui parte a
  // marcação de presenças em silêncio, por isso a ordem é o que se testa.
  it('começa à segunda e acaba ao domingo', () => {
    expect(DIAS_SEMANA).toEqual([
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
      'Domingo',
    ])
  })
})

describe('plural', () => {
  it('não escreve "1 alunos"', () => {
    expect(plural(1, 'aluno', 'alunos')).toBe('1 aluno')
  })

  it('usa o plural para zero, como em português', () => {
    expect(plural(0, 'aluno', 'alunos')).toBe('0 alunos')
  })

  it('usa o plural acima de um', () => {
    expect(plural(3, 'aula', 'aulas')).toBe('3 aulas')
  })

  it('aceita plurais irregulares, que uma regra genérica erraria', () => {
    expect(plural(2, 'lição', 'lições')).toBe('2 lições')
  })
})

describe('palavra', () => {
  it('devolve só a palavra, sem o número', () => {
    expect(palavra(1, 'aula', 'aulas')).toBe('aula')
    expect(palavra(0, 'aula', 'aulas')).toBe('aulas')
    expect(palavra(5, 'aula', 'aulas')).toBe('aulas')
  })
})

describe('formatarSala', () => {
  // Na base de dados o nome inclui o professor, para lá ser inequívoco
  // ("Sala 1 — Piso 3 (João Marcelino)"). Ao aluno isso não interessa.
  it('prefere piso e número ao nome guardado', () => {
    expect(
      formatarSala({ nome: 'Sala 1 — Piso 3 (João Marcelino)', piso: 3, numero: 1 })
    ).toBe('Sala 1, Piso 3')
  })

  it('cai para o nome quando falta o piso ou o número', () => {
    expect(formatarSala({ nome: 'Auditório', piso: null, numero: null })).toBe('Auditório')
    expect(formatarSala({ nome: 'Auditório', piso: 2, numero: null })).toBe('Auditório')
    expect(formatarSala({ nome: 'Auditório', piso: null, numero: 2 })).toBe('Auditório')
  })

  // Piso 0 é o rés-do-chão e existe mesmo. Um teste `if (sala.piso)` em vez
  // de `!== null` mandava-o para o ramo errado.
  it('trata o piso 0 como piso e não como ausência', () => {
    expect(formatarSala({ nome: 'Sala 4', piso: 0, numero: 4 })).toBe('Sala 4, Piso 0')
  })

  it('devolve null quando não há sala', () => {
    expect(formatarSala(null)).toBeNull()
  })
})

describe('horarios-grade', () => {
  it('mede uma hora de relógio em pixels', () => {
    expect(HOUR_HEIGHT).toBe(64)
  })

  it('converte hh:mm:ss em minutos desde a meia-noite', () => {
    expect(paraMinutos('00:00:00')).toBe(0)
    expect(paraMinutos('10:30:00')).toBe(630)
    expect(paraMinutos('23:59:00')).toBe(1439)
  })

  it('aceita hh:mm sem os segundos', () => {
    expect(paraMinutos('10:30')).toBe(630)
  })

  // "10h" e não "10h00": à hora certa o zero é ruído numa grelha cheia.
  it('esconde os minutos à hora certa', () => {
    expect(formatarHora('10:00:00')).toBe('10h')
    expect(formatarHora('09:00:00')).toBe('9h')
  })

  it('mostra os minutos com dois dígitos quando existem', () => {
    expect(formatarHora('10:05:00')).toBe('10h05')
    expect(formatarHora('10:30:00')).toBe('10h30')
  })
})

describe('ano-letivo', () => {
  it('vai de setembro a agosto, doze meses', () => {
    expect(MESES_ANO_LETIVO).toHaveLength(12)
    expect(MESES_ANO_LETIVO[0]).toEqual({ ano: 2026, mes: 9, label: 'Setembro' })
    expect(MESES_ANO_LETIVO[11]).toEqual({ ano: 2027, mes: 8, label: 'Agosto' })
  })

  it('vira o ano civil ao passar de dezembro para janeiro', () => {
    expect(MESES_ANO_LETIVO[3]).toEqual({ ano: 2026, mes: 12, label: 'Dezembro' })
    expect(MESES_ANO_LETIVO[4]).toEqual({ ano: 2027, mes: 1, label: 'Janeiro' })
  })

  it('nomeia o mês por extenso para leitores de ecrã', () => {
    expect(rotuloMes(2026, 9)).toBe('Setembro de 2026')
    expect(rotuloMes(2027, 1)).toBe('Janeiro de 2027')
  })
})

describe('calcularIdade', () => {
  it('conta os anos completos', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 12))
    expect(calcularIdade('2000-01-01')).toBe(26)
  })

  // O caso que decide escalões de dança: fazer anos amanhã ainda é ter a
  // idade de ontem. Arredondar para cima punha crianças na turma errada.
  it('não conta o ano de quem ainda não fez anos', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 12))
    expect(calcularIdade('2000-08-13')).toBe(25)
    expect(calcularIdade('2000-09-01')).toBe(25)
  })

  it('conta o ano no próprio dia dos anos', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 12))
    expect(calcularIdade('2000-08-12')).toBe(26)
  })

  it('devolve null sem data de nascimento', () => {
    expect(calcularIdade(null)).toBeNull()
    expect(calcularIdade(undefined)).toBeNull()
    expect(calcularIdade('')).toBeNull()
  })

  it('devolve null para uma data inválida em vez de NaN', () => {
    expect(calcularIdade('nao-e-uma-data')).toBeNull()
  })
})
