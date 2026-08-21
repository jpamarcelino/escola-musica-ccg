import type { DocumentoLegal } from './tipos'

export const COOKIES: DocumentoLegal = {
  tipo: 'cookies',
  caminho: '/legal/cookies',
  titulo: 'Política de Cookies',
  resumo: 'Que cookies a app usa e porquê. Neste momento, só os estritamente necessários para entrar e manter a sessão.',
  versao: '1.0',
  elaboradoEm: '2026-08-21',
  entradaEmVigor: null,
  seccoes: [
    {
      numero: '1',
      titulo: 'O que são cookies',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Cookies são pequenos ficheiros ou identificadores guardados no dispositivo para permitir determinadas funcionalidades, como manter uma sessão iniciada.',
        },
      ],
    },
    {
      numero: '2',
      titulo: 'Cookies utilizados',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'No estado atual, a aplicação utiliza cookies estritamente necessários para autenticação, manutenção e renovação da sessão, segurança e funcionamento técnico. Estes cookies são fornecidos através da infraestrutura de autenticação Supabase e não são utilizados para publicidade comportamental.',
        },
        {
          tipo: 'tabela',
          colunas: ['Categoria e finalidade', 'Consentimento'],
          linhas: [
            [
              'Autenticação e sessão — permitir entrar, manter a sessão e controlar o acesso às áreas reservadas.',
              'Não, por serem necessários ao serviço pedido.',
            ],
            [
              'Segurança — prevenir abuso, proteger pedidos e assegurar o funcionamento técnico.',
              'Não, quando estritamente necessários.',
            ],
            [
              'Analytics ou publicidade — não utilizados na versão atual analisada.',
              'Exigiria avaliação e, em regra, consentimento prévio.',
            ],
          ],
        },
      ],
    },
    {
      numero: '3',
      titulo: 'Gestão',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O utilizador pode eliminar ou bloquear cookies nas definições do navegador. O bloqueio de cookies necessários pode impedir o login ou o funcionamento das áreas reservadas.',
        },
      ],
    },
    {
      numero: '4',
      titulo: 'Futuras tecnologias',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Se forem adicionados cookies ou tecnologias não essenciais, a Política será atualizada e será apresentado um mecanismo de consentimento antes da sua utilização, com possibilidade equivalente de aceitar e rejeitar.',
        },
      ],
    },
  ],
}
