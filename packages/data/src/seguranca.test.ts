import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// A regra que este teste defende está escrita no .env.example do projeto:
// a `service role key` ignora todas as regras de RLS e serve só para
// scripts locais. Nunca em código que vai para produção.
//
// Num monorepo com uma app móvel a caminho, isso deixa de ser conselho e
// passa a ser risco concreto: tudo o que entra num pacote partilhado pode
// acabar dentro do bundle instalado no telemóvel de alguém, onde qualquer
// pessoa o consegue ler. Uma chave que ignora RLS nesse sítio é acesso
// total à base de dados de uma escola — moradas e contactos de crianças
// incluídos.
//
// Escrito como teste e não como convenção porque convenções não falham
// builds.

const aqui = dirname(fileURLToPath(import.meta.url))
const PACOTES = join(aqui, '..', '..')

const PROIBIDO = [
  { padrao: /SERVICE_ROLE/i, porque: 'a service role key ignora todas as regras de RLS' },
  { padrao: /process\.env/, porque: 'um pacote partilhado não deve ler o ambiente — recebe o que precisa por parâmetro' },
  { padrao: /createClient\s*\(/, porque: 'os pacotes recebem o cliente Supabase, nunca o criam' },
  { padrao: /\beyJ[A-Za-z0-9_-]{20,}/, porque: 'parece uma chave JWT escrita no código' },
]

function ficheirosFonte(raiz: string): string[] {
  const encontrados: string[] = []
  const percorrer = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      if (nome === 'node_modules' || nome === '.git') continue
      const caminho = join(dir, nome)
      if (statSync(caminho).isDirectory()) percorrer(caminho)
      else if (/\.(ts|tsx|js|mjs)$/.test(caminho)) encontrados.push(caminho)
    }
  }
  percorrer(raiz)
  return encontrados
}

describe('nenhum pacote partilhado toca em credenciais', () => {
  const ficheiros = ficheirosFonte(PACOTES).filter((f) => !f.endsWith('seguranca.test.ts'))

  it('encontra ficheiros para verificar (senão o teste não prova nada)', () => {
    expect(ficheiros.length).toBeGreaterThan(10)
  })

  for (const { padrao, porque } of PROIBIDO) {
    it(`nada em packages/ corresponde a ${padrao} — ${porque}`, () => {
      const culpados = ficheiros
        .filter((f) => padrao.test(readFileSync(f, 'utf-8')))
        .map((f) => relative(PACOTES, f))
      expect(culpados).toEqual([])
    })
  }
})
