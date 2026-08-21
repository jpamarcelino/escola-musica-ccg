import { describe, expect, it } from 'vitest'
import { MESES_DE_AULAS, evolucaoDeAlunos, type MatriculaParaEvolucao } from './evolucao-alunos'

function matricula(over: Partial<MatriculaParaEvolucao> = {}): MatriculaParaEvolucao {
  return {
    aluno_id: 'a1',
    estado: 'confirmado',
    criado_em: '2026-09-15T10:00:00+00:00',
    cancelada_em: null,
    ...over,
  }
}

// Depois de junho de 2027 o ano acabou — usar uma data desse futuro faz
// com que nenhum mês seja previsão, e os testes falam só de contagens.
const DEPOIS_DO_ANO = '2027-08-01'

function contagens(matriculas: MatriculaParaEvolucao[], hoje = DEPOIS_DO_ANO) {
  return evolucaoDeAlunos(matriculas, hoje).map((p) => p.alunos)
}

describe('MESES_DE_AULAS', () => {
  it('vai de outubro de 2026 a junho de 2027', () => {
    expect(MESES_DE_AULAS).toHaveLength(9)
    expect(MESES_DE_AULAS[0]).toEqual({ ano: 2026, mes: 10, label: 'Outubro' })
    expect(MESES_DE_AULAS[8]).toEqual({ ano: 2027, mes: 6, label: 'Junho' })
  })
})

describe('evolucaoDeAlunos', () => {
  it('sem matrículas, o ano inteiro a zero', () => {
    expect(contagens([])).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('quem se inscreveu antes do ano conta desde outubro', () => {
    expect(contagens([matricula()])).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1])
  })

  it('quem entra a meio só conta a partir do mês em que entrou', () => {
    expect(contagens([matricula({ criado_em: '2027-01-20T09:00:00+00:00' })])).toEqual([
      0, 0, 0, 1, 1, 1, 1, 1, 1,
    ])
  })

  it('quem cancela deixa de contar no mês seguinte, mas conta no mês em que cancelou', () => {
    const m = matricula({ estado: 'cancelado', cancelada_em: '2026-12-04T18:00:00+00:00' })
    expect(contagens([m])).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0])
  })

  it('um pedido por responder ainda não é um aluno', () => {
    expect(contagens([matricula({ estado: 'a_escolher' })])).toEqual([
      0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
  })

  it('duas disciplinas do mesmo aluno são um aluno só', () => {
    const duas = [matricula(), matricula()]
    expect(contagens(duas)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1])
  })

  it('alunos diferentes somam', () => {
    const dois = [matricula({ aluno_id: 'a1' }), matricula({ aluno_id: 'a2' })]
    expect(contagens(dois)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2])
  })

  it('um aluno que sai e outro que entra: a linha não se mexe, mas não são os mesmos', () => {
    const saiu = matricula({ aluno_id: 'a1', cancelada_em: '2027-01-31T20:00:00+00:00', estado: 'cancelado' })
    const entrou = matricula({ aluno_id: 'a2', criado_em: '2027-02-01T09:00:00+00:00' })
    expect(contagens([saiu, entrou])).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1])
  })

  it('o mês corrente não é previsão; os seguintes são', () => {
    const pontos = evolucaoDeAlunos([], '2026-12-10')
    expect(pontos.map((p) => p.previsto)).toEqual([
      false, false, false, true, true, true, true, true, true,
    ])
  })

  it('antes do ano começar, é tudo previsão', () => {
    const pontos = evolucaoDeAlunos([matricula()], '2026-08-21')
    expect(pontos.every((p) => p.previsto)).toBe(true)
    // As matrículas já confirmadas valem para os meses que aí vêm — a
    // previsão não é uma linha em branco.
    expect(pontos.map((p) => p.alunos)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1])
  })
})
