import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { PRIVACIDADE } from './privacidade'
import { TERMOS } from './termos'
import { COOKIES } from './cookies'
import { INFORMACAO } from './informacao'
import { textoCanonico } from './tipos'
import type { DocumentoLegal } from './tipos'

function hash(doc: DocumentoLegal): string {
  return createHash('sha256').update(textoCanonico(doc), 'utf8').digest('hex')
}

// O hash de cada versão publicada, fixado aqui.
//
// Não é decoração: é o que impede uma alteração silenciosa. Editar uma
// vírgula num documento sem subir a versão faz este teste falhar, e quem
// falhar tem de decidir — é editorial (sobe a versão, avisa) ou material
// (sobe a versão, exige nova aceitação)? A pergunta passa a ser feita
// sempre, em vez de nunca.
//
// O mesmo valor tem de estar em documentos_legais.hash_texto (0053). Se
// divergirem, alguém publicou código sem publicar o documento.
const HASHES: Record<string, string> = {
  privacidade:
    '57ffd4c385a8027ac0306911a22b429f59fcc1a4c49f6de91f31282057f6b272',
  termos:
    'f27120157014f25c9cda13995562feff2fd395a14e286f7acf8e1dfbc8ad5e11',
  cookies:
    'a7cabd78f558c28877c8d38e09db1f6040acf1b13f2cab7e2358b23504574195',
  informacao:
    'b66252edd295c12ee062798a4a414776636d6525c0a609b18f5308a7d07f56da',
}

describe('documentos legais', () => {
  it.each([PRIVACIDADE, TERMOS, COOKIES, INFORMACAO])(
    'o texto de $tipo não mudou sem subir a versão',
    (doc) => {
      expect(hash(doc)).toBe(HASHES[doc.tipo])
    }
  )

  it('todos declaram versão e data de elaboração', () => {
    for (const doc of [PRIVACIDADE, TERMOS, COOKIES, INFORMACAO]) {
      expect(doc.versao).toMatch(/^\d+\.\d+$/)
      expect(doc.elaboradoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('nenhum documento público contém notas internas do pacote', () => {
    // As caixas "VALIDAÇÃO NECESSÁRIA" e "NÃO PUBLICAR" são instruções
    // para a Direção, não condições contratuais. Se alguma escorregar
    // para o texto publicado, este teste apanha-a.
    for (const doc of [PRIVACIDADE, TERMOS, COOKIES, INFORMACAO]) {
      const texto = textoCanonico(doc)
      expect(texto).not.toContain('VALIDAÇÃO NECESSÁRIA')
      expect(texto).not.toContain('NÃO PUBLICAR')
      expect(texto).not.toContain('RASCUNHO')
    }
  })
})
