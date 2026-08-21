import type { DocumentoLegal } from './tipos'
import { CCG, CNIACC, CNPD, LIVRO_RECLAMACOES_URL } from './entidade'

export const INFORMACAO: DocumentoLegal = {
  tipo: 'informacao',
  caminho: '/legal/informacao',
  titulo: 'Informação Legal e do Consumidor',
  resumo: 'Quem é o operador, como reclamar e a que entidades te podes dirigir.',
  versao: '1.0',
  elaboradoEm: '2026-08-21',
  entradaEmVigor: null,
  seccoes: [
    {
      titulo: 'Identificação',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            CCG.nome,
            `NIPC ${CCG.nipc}`,
            CCG.morada,
            `Email: ${CCG.email}`,
            `Telefone: ${CCG.telefone}`,
          ],
        },
      ],
    },
    {
      titulo: 'Livro de Reclamações',
      blocos: [
        {
          tipo: 'paragrafo',
          // Enquanto o registo não estiver concluído, o texto diz
          // exatamente isso — e o documento jurídico é explícito em não
          // deixar parecer o contrário.
          texto:
            LIVRO_RECLAMACOES_URL === null
              ? 'O CCG mantém Livro de Reclamações físico disponível na secretaria. O acesso ao Livro de Reclamações Eletrónico será disponibilizado em www.livroreclamacoes.pt após conclusão do registo do CCG como operador.'
              : 'O CCG mantém Livro de Reclamações físico disponível na secretaria. O Livro de Reclamações Eletrónico está acessível através da ligação abaixo.',
        },
      ],
    },
    {
      titulo: 'Resolução alternativa de litígios',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            CNIACC.nome,
            `Sítio: ${CNIACC.url}`,
            `Email: ${CNIACC.email} | Telefone: ${CNIACC.telefone}`,
          ],
        },
        { tipo: 'paragrafo', texto: 'O CNIACC abrange todos os municípios do distrito da Guarda.' },
      ],
    },
    {
      titulo: 'Proteção de dados',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            `Para exercer direitos: ${CCG.email}`,
            `Autoridade de controlo: ${CNPD.nome} — ${CNPD.url}`,
          ],
        },
      ],
    },
  ],
}
