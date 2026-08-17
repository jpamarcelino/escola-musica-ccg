import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  agoraNaEscola,
  dataEhFutura,
  dataMaisRecenteDoDia,
  datasDoDia,
  diaSemanaDaData,
  estadoTemporalAula,
  formatarDataEscolar,
  hojeISO,
  proximaOcorrenciaDeAula,
  proximaOcorrenciaDoDia,
} from './datas'

// Calendário de referência usado abaixo (2026):
//   ago 10 = segunda    ago 14 = sexta
//   ago 11 = terça      ago 15 = sábado
//   ago 12 = quarta     ago 16 = domingo
//   ago 13 = quinta     ago 17 = segunda
const QUARTA = '2026-08-12'

afterEach(() => {
  vi.useRealTimers()
})

describe('agoraNaEscola', () => {
  // O servidor da Vercel corre em UTC. Sem esta conversão, uma aula às
  // 00h30 de Lisboa em julho aparecia no dia anterior para toda a gente.
  it('converte para a hora de Lisboa no horário de verão (UTC+1)', () => {
    const naEscola = agoraNaEscola(new Date('2026-08-12T10:00:00Z'))
    expect(naEscola.getHours()).toBe(11)
    expect(naEscola.getDate()).toBe(12)
  })

  it('converte para a hora de Lisboa no inverno (UTC+0)', () => {
    const naEscola = agoraNaEscola(new Date('2026-01-15T10:00:00Z'))
    expect(naEscola.getHours()).toBe(10)
  })

  // O caso que motiva a função: às 23h30 UTC de verão já é o dia seguinte
  // em Lisboa. Uma aula marcada para essa noite tem de contar no dia certo.
  it('avança o dia quando Lisboa já virou a meia-noite e o UTC não', () => {
    const naEscola = agoraNaEscola(new Date('2026-08-12T23:30:00Z'))
    expect(naEscola.getDate()).toBe(13)
    expect(naEscola.getHours()).toBe(0)
    expect(naEscola.getMinutes()).toBe(30)
  })
})

describe('diaSemanaDaData', () => {
  it('usa a convenção da app (Segunda primeiro), não a do JavaScript', () => {
    expect(diaSemanaDaData('2026-08-10')).toBe('Segunda')
    expect(diaSemanaDaData(QUARTA)).toBe('Quarta')
    expect(diaSemanaDaData('2026-08-15')).toBe('Sábado')
  })

  // getDay() dá 0 ao domingo; aqui o domingo é o último. É a troca mais
  // fácil de enganar e a que partiria a grelha de horários toda.
  it('põe o domingo no fim da semana e não no início', () => {
    expect(diaSemanaDaData('2026-08-16')).toBe('Domingo')
  })
})

describe('dataMaisRecenteDoDia', () => {
  it('devolve hoje quando hoje é esse dia da semana', () => {
    expect(dataMaisRecenteDoDia('Quarta', new Date(2026, 7, 12))).toBe(QUARTA)
  })

  it('recua para a ocorrência anterior quando ainda não chegou', () => {
    // Quarta-feira, a olhar para sexta: a última sexta foi a 7.
    expect(dataMaisRecenteDoDia('Sexta', new Date(2026, 7, 12))).toBe('2026-08-07')
  })

  it('recua no máximo seis dias', () => {
    expect(dataMaisRecenteDoDia('Quinta', new Date(2026, 7, 12))).toBe('2026-08-06')
  })

  it('atravessa a mudança de mês', () => {
    expect(dataMaisRecenteDoDia('Sexta', new Date(2026, 7, 3))).toBe('2026-07-31')
  })
})

describe('proximaOcorrenciaDoDia', () => {
  it('inclui hoje', () => {
    expect(proximaOcorrenciaDoDia('Quarta', new Date(2026, 7, 12))).toBe(QUARTA)
  })

  it('avança para a semana seguinte quando o dia já passou', () => {
    // Quarta a olhar para segunda: a próxima segunda é a 17.
    expect(proximaOcorrenciaDoDia('Segunda', new Date(2026, 7, 12))).toBe('2026-08-17')
  })
})

describe('proximaOcorrenciaDeAula', () => {
  // A diferença para proximaOcorrenciaDoDia, e a razão de existirem as
  // duas: no cartão "Próxima aula", uma aula que acabou há uma hora não
  // pode continuar a aparecer como a próxima.
  it('mantém hoje quando a aula ainda não acabou', () => {
    const agora = new Date(2026, 7, 12, 9, 0)
    expect(proximaOcorrenciaDeAula('Quarta', '10:00', '11:00', agora)).toBe(QUARTA)
  })

  it('mantém hoje durante a própria aula', () => {
    const agora = new Date(2026, 7, 12, 10, 30)
    expect(proximaOcorrenciaDeAula('Quarta', '10:00', '11:00', agora)).toBe(QUARTA)
  })

  it('salta para a semana seguinte quando a aula de hoje já acabou', () => {
    const agora = new Date(2026, 7, 12, 11, 30)
    expect(proximaOcorrenciaDeAula('Quarta', '10:00', '11:00', agora)).toBe('2026-08-19')
  })

  it('usa a hora de início quando não há hora de fim', () => {
    const agora = new Date(2026, 7, 12, 10, 30)
    expect(proximaOcorrenciaDeAula('Quarta', '10:00', undefined, agora)).toBe('2026-08-19')
  })
})

describe('estadoTemporalAula', () => {
  const agora = new Date(2026, 7, 12, 10, 30)

  it('diz "agora" durante a aula', () => {
    expect(estadoTemporalAula(QUARTA, '10:00:00', '11:00:00', agora)).toBe('agora')
  })

  it('inclui o minuto de início', () => {
    const inicio = new Date(2026, 7, 12, 10, 0)
    expect(estadoTemporalAula(QUARTA, '10:00:00', '11:00:00', inicio)).toBe('agora')
  })

  // Fim exclusivo: às 11h00 em ponto a aula das 10h já não está a decorrer.
  // Se fosse inclusivo, duas aulas seguidas apareciam ambas como "agora".
  it('exclui o minuto de fim', () => {
    const fim = new Date(2026, 7, 12, 11, 0)
    expect(estadoTemporalAula(QUARTA, '10:00:00', '11:00:00', fim)).toBe('proxima')
  })

  it('diz "proxima" para outra hora do mesmo dia', () => {
    expect(estadoTemporalAula(QUARTA, '15:00:00', '16:00:00', agora)).toBe('proxima')
  })

  it('diz "futura" para outro dia', () => {
    expect(estadoTemporalAula('2026-08-19', '10:00:00', '11:00:00', agora)).toBe('futura')
  })
})

describe('datasDoDia', () => {
  it('gera uma data por semana, com as pontas incluídas', () => {
    expect(datasDoDia('Quarta', '2026-08-01', '2026-08-31')).toEqual([
      '2026-08-05',
      '2026-08-12',
      '2026-08-19',
      '2026-08-26',
    ])
  })

  it('inclui o próprio "desde" quando cai nesse dia da semana', () => {
    expect(datasDoDia('Quarta', QUARTA, '2026-08-26')).toEqual([
      QUARTA,
      '2026-08-19',
      '2026-08-26',
    ])
  })

  it('inclui o próprio "ate" quando cai nesse dia da semana', () => {
    expect(datasDoDia('Quarta', '2026-08-13', '2026-08-19')).toEqual(['2026-08-19'])
  })

  it('devolve lista vazia quando não há nenhuma ocorrência no intervalo', () => {
    expect(datasDoDia('Quarta', '2026-08-13', '2026-08-18')).toEqual([])
  })

  it('atravessa a mudança de ano', () => {
    expect(datasDoDia('Quinta', '2026-12-28', '2027-01-10')).toEqual([
      '2026-12-31',
      '2027-01-07',
    ])
  })

  // A hora de inverno entra no último domingo de outubro. Somar 7×24h em
  // milissegundos daria aqui um erro de uma hora que acabava por saltar um
  // dia; a implementação soma dias de calendário, e é isto que o garante.
  it('não escorrega um dia na mudança para a hora de inverno', () => {
    expect(datasDoDia('Quarta', '2026-10-21', '2026-11-11')).toEqual([
      '2026-10-21',
      '2026-10-28',
      '2026-11-04',
      '2026-11-11',
    ])
  })

  it('não escorrega um dia na mudança para a hora de verão', () => {
    expect(datasDoDia('Quarta', '2027-03-24', '2027-04-14')).toEqual([
      '2027-03-24',
      '2027-03-31',
      '2027-04-07',
      '2027-04-14',
    ])
  })
})

describe('formatarDataEscolar', () => {
  // O bug que esta função evita: `new Date('2026-01-01')` é meia-noite UTC,
  // que em fusos a oeste de Londres é ainda 31 de dezembro. A data escolar
  // não pode mudar consoante o servidor.
  it('não recua um dia por causa do fuso', () => {
    expect(formatarDataEscolar('2026-01-01')).toBe('1 de janeiro')
  })

  it('formata em português', () => {
    expect(formatarDataEscolar(QUARTA)).toBe('12 de agosto')
  })

  it('aceita outras opções de formato', () => {
    expect(formatarDataEscolar(QUARTA, { weekday: 'long' })).toBe('quarta-feira')
  })
})

describe('hojeISO e dataEhFutura', () => {
  it('hojeISO devolve o dia de Lisboa, não o do servidor em UTC', () => {
    vi.useFakeTimers()
    // 23h30 UTC em agosto: em Lisboa já é dia 13.
    vi.setSystemTime(new Date('2026-08-12T23:30:00Z'))
    expect(hojeISO()).toBe('2026-08-13')
  })

  it('hoje não conta como futuro', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-12T10:00:00Z'))
    expect(dataEhFutura(QUARTA)).toBe(false)
    expect(dataEhFutura('2026-08-13')).toBe(true)
    expect(dataEhFutura('2026-08-11')).toBe(false)
  })
})
