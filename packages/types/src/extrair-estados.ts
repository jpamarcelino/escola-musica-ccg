// Lê o esquema e as migrações e devolve os valores que cada constraint
// CHECK permite.
//
// Porque existe: na base de dados as colunas de estado são `text` com uma
// constraint CHECK, e não tipos enum. Do lado do TypeScript aparecem como
// `string`, o que deixa passar qualquer literal mal escrito até o Postgres
// o recusar — em produção, no meio de uma operação do utilizador.
//
// O estado final de cada constraint não se lê no schema.sql: esse ficheiro
// é o ponto de partida e as migrações alteram-no por cima. O `tipo` de
// perfis_escola, por exemplo, muda três vezes ao longo das 25. Por isso os
// ficheiros são lidos por ordem e as alterações aplicadas uma a uma.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export type Uniao = {
  tabela: string
  coluna: string
  valores: string[]
  /** Ficheiro que fixou os valores actuais — para se saber onde mexer. */
  origem: string
}

// O Postgres aceita duas escritas para a mesma restrição, e o projeto usa
// as duas: `col in ('a','b')` e `col = any (array['a','b'])`, esta última
// na migração 0023. Ler só a primeira deixava instrumentos.programa sem o
// programa 'bebes'.
const LISTA = String.raw`(?:in\s*\(|=\s*any\s*\(\s*array\s*\[)`

const CREATE_TABLE = new RegExp(
  String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)\s*\(([\s\S]*?)\n\)\s*;`,
  'gi'
)
const CHECK_INLINE = new RegExp(
  String.raw`([a-z_]+)\s+text[^,]*?check\s*\(\s*\1\s+${LISTA}([^)\]]*)`,
  'gi'
)
const ADD_CHECK = new RegExp(
  String.raw`alter\s+table\s+(?:public\.)?([a-z_]+)\s+add\s+constraint\s+([a-z_]+)\s*` +
    String.raw`check\s*\(\s*([a-z_]+)\s+${LISTA}([^)\]]*)`,
  'gi'
)
// Uma coluna nova com a lista já colada nela:
//
//   alter table reposicoes add column estado text ... check (estado in (...))
//
// É SQL legal e o projeto usa-o (0039). Sem esta leitura, o estado novo
// não chegava aos tipos e o TypeScript continuava a aceitar literais
// inventados para a coluna.
const ADD_COLUMN_CHECK = new RegExp(
  String.raw`alter\s+table\s+(?:public\.)?([a-z_]+)[\s\S]{0,200}?add\s+column\s+([a-z_]+)\s+text[^;]*?` +
    String.raw`check\s*\(\s*\2\s+${LISTA}([^)\]]*)`,
  'gi'
)
const DROP_CHECK = new RegExp(
  String.raw`alter\s+table\s+(?:public\.)?([a-z_]+)\s+drop\s+constraint\s+(?:if\s+exists\s+)?([a-z_]+)`,
  'gi'
)

function literais(bruto: string): string[] {
  return [...bruto.matchAll(/'([^']*)'/g)].map((m) => m[1])
}

function semComentarios(sql: string): string {
  return sql.replace(/--[^\n]*/g, '')
}

export function extrairEstados(pastaSupabase: string): Uniao[] {
  const ficheiros = [
    join(pastaSupabase, 'schema.sql'),
    ...readdirSync(join(pastaSupabase, 'migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => join(pastaSupabase, 'migrations', f)),
  ]

  const valores = new Map<string, string[]>()
  const origem = new Map<string, string>()
  // nome da constraint -> chave, para um DROP saber o que remover
  const porConstraint = new Map<string, string>()

  const chave = (tabela: string, coluna: string) => `${tabela}.${coluna}`

  for (const caminho of ficheiros) {
    const sql = semComentarios(readFileSync(caminho, 'utf-8'))
    const nome = caminho.split(/[/\\]/).pop() ?? caminho

    for (const tabela of sql.matchAll(CREATE_TABLE)) {
      for (const c of tabela[2].matchAll(CHECK_INLINE)) {
        const k = chave(tabela[1], c[1])
        valores.set(k, literais(c[2]))
        origem.set(k, nome)
        // uma constraint sem nome fica <tabela>_<coluna>_check
        porConstraint.set(`${tabela[1]}.${tabela[1]}_${c[1]}_check`, k)
      }
    }

    for (const d of sql.matchAll(DROP_CHECK)) {
      const k = porConstraint.get(`${d[1]}.${d[2]}`)
      if (k) {
        valores.delete(k)
        porConstraint.delete(`${d[1]}.${d[2]}`)
      }
    }

    for (const c of sql.matchAll(ADD_COLUMN_CHECK)) {
      const k = chave(c[1], c[2])
      valores.set(k, literais(c[3]))
      origem.set(k, nome)
    }

    for (const a of sql.matchAll(ADD_CHECK)) {
      const k = chave(a[1], a[3])
      valores.set(k, literais(a[4]))
      origem.set(k, nome)
      porConstraint.set(`${a[1]}.${a[2]}`, k)
    }
  }

  return [...valores.entries()]
    .map(([k, vals]) => {
      const [tabela, coluna] = k.split('.')
      return { tabela, coluna, valores: vals, origem: origem.get(k) ?? '?' }
    })
    .sort((a, b) => `${a.tabela}.${a.coluna}`.localeCompare(`${b.tabela}.${b.coluna}`))
}

export function nomeDoTipo(tabela: string, coluna: string): string {
  const camel = (s: string) =>
    s
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join('')
  // Os nomes das tabelas são identificadores SQL, portanto sem acentos:
  // "recomendacoes", "notificacoes". Tirar só o "s" final dava
  // "Recomendacoe", que não é palavra nenhuma — em português o plural
  // -ões desfaz-se para -ão.
  const singular = tabela.endsWith('oes')
    ? tabela.slice(0, -3) + 'ao'
    : tabela.endsWith('s') && !tabela.endsWith('ss')
      ? tabela.slice(0, -1)
      : tabela
  return camel(singular) + camel(coluna)
}

export function gerarFicheiro(unioes: Uniao[]): string {
  const linhas: string[] = [
    '// GERADO — não editar à mão.',
    '//',
    '// Produzido a partir de supabase/schema.sql e das migrações, aplicadas',
    '// por ordem. Para regenerar depois de uma migração nova:',
    '//',
    '//     pnpm --filter @ccg/types gerar',
    '//',
    '// Há um teste que repete a extração e compara com este ficheiro, por',
    '// isso uma migração que mude os valores permitidos e se esqueça de',
    '// regenerar faz falhar a suite em vez de divergir em silêncio.',
    '',
  ]

  for (const u of unioes) {
    const tipo = nomeDoTipo(u.tabela, u.coluna)
    linhas.push(`// ${u.tabela}.${u.coluna} — fixado em ${u.origem}`)
    linhas.push(`export type ${tipo} = ${u.valores.map((v) => `'${v}'`).join(' | ')}`)
    linhas.push('')
    linhas.push(`export const ${tipo.toUpperCase()}_VALORES = [`)
    for (const v of u.valores) linhas.push(`  '${v}',`)
    linhas.push(`] as const satisfies readonly ${tipo}[]`)
    linhas.push('')
  }

  return linhas.join('\n')
}
