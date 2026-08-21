// Identificação do operador e ligações externas, num sítio só.
//
// Centralizado de propósito: estes valores aparecem no rodapé, na área de
// Conta, na Informação Legal e nos Termos. Espalhados, um deles ficava
// desatualizado e ninguém dava por isso.

export const CCG = {
  nome: 'Centro Cultural da Guarda',
  nipc: '501 430 881',
  morada: 'Rua Alves Roçadas — Paço da Cultura, 6300-663 Guarda',
  email: 'geral@centroculturalguarda.pt',
  telefone: '961 384 075',
} as const

// Resolução alternativa de litígios. Pode ser publicado desde já.
export const CNIACC = {
  nome: 'CNIACC — Centro Nacional de Informação e Arbitragem de Conflitos de Consumo',
  url: 'https://www.cniacc.pt/',
  email: 'geral@cniacc.pt',
  telefone: '253 619 107',
} as const

export const CNPD = { nome: 'Comissão Nacional de Proteção de Dados', url: 'https://www.cnpd.pt/' } as const

// Livro de Reclamações Eletrónico.
//
// `null` enquanto o CCG não concluir o registo como operador. Enquanto for
// nulo, a app diz que o livro físico está na secretaria e que o eletrónico
// fica disponível depois do registo — e NÃO apresenta ligação nenhuma.
//
// Uma ligação genérica para livroreclamacoes.pt seria pior do que não ter
// ligação: dá a entender que se pode reclamar ali do CCG, quando o
// formulário exige que o operador esteja registado. O visitante clicava,
// não encontrava a entidade, e concluía que a escola se estava a esconder.
//
// Quando o registo estiver concluído, põe-se aqui o URL específico do
// operador e a ligação aparece sozinha em todo o lado. Ver a verificação
// bloqueante em DEPLOY.md.
export const LIVRO_RECLAMACOES_URL: string | null = null
