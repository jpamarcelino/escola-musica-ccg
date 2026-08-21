// Os textos jurídicos, como dados.
//
// Vivem em ficheiros e não na base de dados: são conteúdo do produto,
// entram no controlo de versões, revêem-se num diff e publicam-se com o
// resto do código. A base guarda apenas a VERSÃO em vigor e quem a
// aceitou — ver a migração 0052.
//
// O texto é transcrito do Pacote Jurídico v1 (21 de agosto de 2026). Não
// é para reescrever ao sabor da interface: se algum ponto contradisser o
// comportamento da app, corrige-se a app ou pede-se decisão à Direção,
// não se ajusta o texto em silêncio.

export type Bloco =
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'tabela'; colunas: [string, string]; linhas: [string, string][] }

export type Seccao = {
  // Numeração tal como no documento, quando existe.
  numero?: string
  titulo: string
  blocos: Bloco[]
}

export type DocumentoLegal = {
  tipo: 'privacidade' | 'termos' | 'cookies' | 'informacao'
  caminho: string
  titulo: string
  // Uma frase que diz de que trata o documento, para a lista de ligações.
  resumo: string
  versao: string
  elaboradoEm: string
  entradaEmVigor: string | null
  seccoes: Seccao[]
}
