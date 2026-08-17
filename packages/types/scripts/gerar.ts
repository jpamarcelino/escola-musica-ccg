// Regenera src/estados.gerado.ts a partir do esquema e das migrações.
//
//     pnpm --filter @ccg/types gerar
//
// Não é preciso correr isto a não ser que uma migração mude os valores
// permitidos por uma constraint CHECK — e nesse caso o teste avisa.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extrairEstados, gerarFicheiro } from '../src/extrair-estados.ts'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = join(aqui, '..', '..', '..')

const unioes = extrairEstados(join(raiz, 'supabase'))
const destino = join(aqui, '..', 'src', 'estados.gerado.ts')

writeFileSync(destino, gerarFicheiro(unioes), 'utf-8')

for (const u of unioes) {
  console.log(`  ${u.tabela}.${u.coluna} → ${u.valores.join(', ')}`)
}
console.log(`\n${unioes.length} uniões escritas em packages/types/src/estados.gerado.ts`)
