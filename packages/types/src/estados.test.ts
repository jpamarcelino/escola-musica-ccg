import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DIAS_SEMANA } from '@ccg/core'
import { extrairEstados, gerarFicheiro, nomeDoTipo } from './extrair-estados.ts'
import {
  HORARIODIASEMANA_VALORES,
  MATRICULAESTADO_VALORES,
  PERFISESCOLATIPO_VALORES,
  PRESENCAESTADO_VALORES,
} from './estados.gerado.ts'

const aqui = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(aqui, '..', '..', '..')
const unioes = extrairEstados(join(RAIZ, 'supabase'))
const porNome = (t: string, c: string) =>
  unioes.find((u) => u.tabela === t && u.coluna === c)

describe('o ficheiro gerado está actualizado', () => {
  // A razão de ser deste teste. Se alguém acrescentar uma migração que
  // mude os valores permitidos e não regenerar, os tipos passam a mentir
  // — e tipos que mentem são piores do que não haver tipos. Aqui a
  // divergência faz falhar a suite em vez de esperar por produção.
  it('bate certo com o que o esquema e as migrações dizem hoje', () => {
    const noDisco = readFileSync(join(aqui, 'estados.gerado.ts'), 'utf-8')
    expect(noDisco.replace(/\r\n/g, '\n')).toBe(gerarFicheiro(unioes))
  })
})

describe('extração das constraints', () => {
  // O schema.sql é só o ponto de partida: o `tipo` de perfis_escola muda
  // três vezes ao longo das migrações e a 0025 é quem manda. Ler só o
  // schema.sql dava 'aluno' num sítio onde ele já não é aceite.
  it('usa o estado final e não o inicial de uma constraint alterada', () => {
    expect(PERFISESCOLATIPO_VALORES).toEqual(['conta', 'professor', 'admin'])
    expect(PERFISESCOLATIPO_VALORES).not.toContain('aluno')
    expect(porNome('perfis_escola', 'tipo')?.origem).toBe(
      '0025_conta_ccg_separada_de_alunos.sql'
    )
  })

  // A 0023 escreve a restrição como `= any (array[...])` e não como
  // `in (...)`. Ler só a segunda forma deixava o programa 'bebes' de
  // fora, e a escola de bebés existe.
  it('lê as duas sintaxes que o Postgres aceita', () => {
    expect(porNome('instrumentos', 'programa')?.valores).toEqual([
      'musica',
      'danca',
      'bebes',
    ])
  })

  it('encontra todas as colunas com valores fixos', () => {
    // 24 desde a 0042 (mensagens_escola.publico e .filtro).
    expect(unioes).toHaveLength(24)
  })

  it('nenhuma união vem vazia', () => {
    for (const u of unioes) {
      expect(u.valores.length, `${u.tabela}.${u.coluna}`).toBeGreaterThan(0)
    }
  })

  it('nenhuma união tem valores repetidos', () => {
    for (const u of unioes) {
      expect(new Set(u.valores).size, `${u.tabela}.${u.coluna}`).toBe(u.valores.length)
    }
  })
})

describe('nomes dos tipos', () => {
  it('põe a tabela no singular', () => {
    expect(nomeDoTipo('matriculas', 'estado')).toBe('MatriculaEstado')
    expect(nomeDoTipo('presencas', 'estado')).toBe('PresencaEstado')
  })

  it('não corta o "s" de uma tabela que não está no plural', () => {
    expect(nomeDoTipo('perfis_escola', 'tipo')).toBe('PerfisEscolaTipo')
  })
})

describe('coerência com o @ccg/core', () => {
  // Os dias da semana existem em dois sítios: a constraint da tabela
  // horarios e o DIAS_SEMANA do core, que é indexado pela posição para
  // converter o getDay() do JavaScript. Se um mudar sem o outro, a
  // marcação de presenças passa a gravar no dia errado sem dar erro.
  it('DIAS_SEMANA e a constraint dizem o mesmo, pela mesma ordem', () => {
    expect(HORARIODIASEMANA_VALORES).toEqual(DIAS_SEMANA)
  })
})

describe('os estados usados pela app existem no esquema', () => {
  // Estes literais estão escritos à mão em queries e Server Actions.
  // Um erro de escrita passava pelo TypeScript e só rebentava no
  // Postgres; aqui rebenta na suite.
  it('matrículas', () => {
    expect(MATRICULAESTADO_VALORES).toContain('confirmado')
    expect(MATRICULAESTADO_VALORES).toContain('a_escolher')
  })

  it('presenças', () => {
    expect(PRESENCAESTADO_VALORES).toEqual([
      'presente',
      'falta_aviso',
      'falta_sem_aviso',
      // Desmarcada pelo professor (0031). A falta é dele e não do aluno,
      // por isso tem estado próprio — as contas de assiduidade não a
      // podem somar às faltas de quem teve a aula desmarcada.
      'falta_professor',
    ])
  })
})
