import { PRIVACIDADE } from './privacidade'
import { TERMOS } from './termos'
import { COOKIES } from './cookies'
import { INFORMACAO } from './informacao'
import type { DocumentoLegal } from './tipos'

export type { Bloco, Seccao, DocumentoLegal } from './tipos'
export { CCG, CNIACC, CNPD, LIVRO_RECLAMACOES_URL } from './entidade'
export { PRIVACIDADE, TERMOS, COOKIES, INFORMACAO }

// Pela ordem em que aparecem nas listas de ligações.
export const DOCUMENTOS: DocumentoLegal[] = [PRIVACIDADE, TERMOS, COOKIES, INFORMACAO]

export function documentoPorTipo(tipo: string): DocumentoLegal | undefined {
  return DOCUMENTOS.find((d) => d.tipo === tipo)
}

// A versão dos Termos que o código publica. A base de dados guarda a
// versão EM VIGOR (migração 0052) e é ela que manda — isto é só o texto
// que corresponde a essa versão. Se as duas divergirem, é sinal de que
// alguém publicou código sem publicar o documento, ou o contrário.
export const VERSAO_TERMOS = TERMOS.versao
export const VERSAO_PRIVACIDADE = PRIVACIDADE.versao
