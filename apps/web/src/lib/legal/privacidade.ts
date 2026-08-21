import type { DocumentoLegal } from './tipos'

export const PRIVACIDADE: DocumentoLegal = {
  tipo: 'privacidade',
  caminho: '/legal/privacidade',
  titulo: 'Política de Privacidade',
  resumo: 'Que dados o CCG trata, com que fundamento, durante quanto tempo e que direitos tens.',
  versao: '1.0',
  elaboradoEm: '2026-08-21',
  entradaEmVigor: null,
  seccoes: [
    {
      numero: '1',
      titulo: 'Quem é responsável pelos dados',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O responsável pelo tratamento dos dados pessoais é o Centro Cultural da Guarda, pessoa coletiva n.º 501 430 881, com sede na Rua Alves Roçadas — Paço da Cultura, 6300-663 Guarda, doravante designado por “CCG”.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para questões sobre privacidade ou para exercer direitos relativos a dados pessoais, pode contactar o CCG através de geral@centroculturalguarda.pt ou do número 961 384 075.',
        },
      ],
    },
    {
      numero: '2',
      titulo: 'A quem se aplica esta política',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Esta Política aplica-se à utilização da aplicação web e móvel das Escolas Artísticas do CCG, incluindo a Escola de Música, a Escola de Dança e a Música para Bebés. Abrange titulares de Conta CCG, alunos dependentes, alunos adultos, professores, administradores, pessoas que submetam pedidos de aula e pessoas mencionadas no Programa de Recomendação.',
        },
      ],
    },
    {
      numero: '3',
      titulo: 'Dados tratados',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Dados de conta: nome, email, número de telemóvel, credenciais de autenticação e identificadores internos.',
            'Dados de aluno: nome, data de nascimento, ligação ao encarregado, escola, disciplina, professor, matrícula e horário.',
            'Dados de acompanhamento: presenças, faltas, cancelamentos, pedidos, mensagens, avisos e materiais associados às aulas.',
            'Dados financeiros: valor da mensalidade, estado e data de pagamento, número de fatura, inscrição, seguro e benefícios.',
            'Dados do Programa de Recomendação: identidade de quem recomenda e de quem é recomendado, modalidade, professor, validação, benefício e informação necessária para apurar o resultado do programa.',
            'Dados de professores: disciplinas, especialidades, disponibilidade, horário e fotografia destinada à apresentação pública da oferta.',
            'Dados técnicos e de segurança: cookies de sessão, data e hora de acessos relevantes, eventos de autenticação, registos de erro e informação necessária para prevenir utilização abusiva.',
          ],
        },
      ],
    },
    {
      numero: '4',
      titulo: 'Como obtemos os dados',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Os dados são fornecidos pelo titular da Conta CCG, pelo encarregado, pelo próprio aluno adulto, pelo professor ou pela administração. Alguns dados resultam da utilização do serviço, como presenças, horários, mensalidades e avisos. Quando alguém indica o nome de uma pessoa que o recomendou, o CCG recebe dados dessa pessoa de forma indireta e utiliza-os apenas para confirmar e administrar o Programa de Recomendação.',
        },
      ],
    },
    {
      numero: '5',
      titulo: 'Finalidades e fundamentos jurídicos',
      blocos: [
        {
          tipo: 'tabela',
          colunas: ['Finalidade', 'Fundamento'],
          linhas: [
            [
              'Criar e gerir contas, perfis de aluno, pedidos, matrículas, horários e comunicações de serviço.',
              'Diligências pré-contratuais e execução da prestação de serviços.',
            ],
            [
              'Gerir presenças, mensalidades, inscrição, seguro, pagamentos e faturação.',
              'Execução do serviço e cumprimento de obrigações legais, contabilísticas e fiscais.',
            ],
            [
              'Proteger a aplicação, controlar acessos e investigar erros ou abuso.',
              'Interesse legítimo do CCG na segurança e continuidade do serviço.',
            ],
            [
              'Gerir o Programa de Recomendação e atribuir benefícios.',
              'Execução das regras do programa e interesse legítimo na sua administração e prevenção de fraude.',
            ],
            [
              'Divulgar fotografias ou testemunhos para fins promocionais não necessários ao serviço.',
              'Consentimento específico, facultativo e revogável.',
            ],
            [
              'Enviar newsletters ou comunicações promocionais.',
              'Consentimento, salvo quando a lei permita comunicação a clientes sobre serviços análogos com direito de oposição.',
            ],
          ],
        },
      ],
    },
    {
      numero: '6',
      titulo: 'Dados de menores',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Conta CCG destina-se a maiores de 18 anos. Os dados de um menor são introduzidos e geridos por um encarregado de educação, representante legal ou outra pessoa que declare possuir legitimidade para o efeito. O CCG pode solicitar confirmação dessa legitimidade quando existam dúvidas justificadas, procurando não recolher documentação excessiva.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A data de nascimento do aluno é utilizada para verificar a adequação etária das modalidades e organizar a prestação do serviço. Não deve ser exigida no registo do mero titular da Conta CCG quando esse titular não é aluno.',
        },
      ],
    },
    {
      numero: '7',
      titulo: 'Quem pode aceder aos dados',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O acesso é limitado ao necessário para cada função. A secretaria e os administradores autorizados acedem aos dados necessários à gestão da escola. Os professores acedem apenas aos dados dos seus alunos e às informações necessárias para preparar e administrar as aulas. Os encarregados acedem apenas aos perfis que gerem.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O CCG utiliza prestadores tecnológicos para autenticação, base de dados, alojamento, armazenamento, envio de email e suporte técnico, designadamente Supabase e Vercel. Estes prestadores tratam dados segundo instruções do CCG e ao abrigo dos contratos aplicáveis.',
        },
      ],
    },
    {
      numero: '8',
      titulo: 'Fotografias e informação pública',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O nome, fotografia, disciplinas e especialidade de um professor podem ser apresentados publicamente para permitir que os interessados conheçam a oferta e escolham um professor. Fotografias, gravações ou testemunhos de alunos não serão usados para divulgação sem base legal adequada e, quando necessário, consentimento específico do próprio ou do representante legal.',
        },
      ],
    },
    {
      numero: '9',
      titulo: 'Transferências internacionais',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Sempre que um prestador trate dados fora do Espaço Económico Europeu, o CCG assegurará a existência de um mecanismo legal de transferência, como uma decisão de adequação ou cláusulas contratuais-tipo, e disponibilizará informação adicional mediante pedido.',
        },
      ],
    },
    {
      numero: '10',
      titulo: 'Conservação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Os dados não são conservados durante mais tempo do que o necessário. O plano de conservação a aplicar é o seguinte, sujeito a prazos legais superiores e à necessidade de defesa de direitos:',
        },
        {
          tipo: 'tabela',
          colunas: ['Categoria', 'Prazo previsto'],
          linhas: [
            ['Pedidos não confirmados', 'Até 12 meses após o último contacto.'],
            [
              'Conta e contactos',
              'Durante a relação e até 2 anos após o encerramento, salvo dados que devam ser apagados antes.',
            ],
            [
              'Perfis, matrículas, horários e presenças',
              'Durante a frequência e até 5 anos após o final do vínculo.',
            ],
            [
              'Mensalidades, faturas, inscrição, seguro e documentos contabilísticos',
              '10 anos civis, ou outro prazo legal aplicável.',
            ],
            ['Mensagens e notificações de serviço', 'Até 2 anos após a respetiva finalidade.'],
            [
              'Recomendações e benefícios',
              'Até 5 anos após o encerramento; elementos contabilísticos associados, 10 anos.',
            ],
            [
              'Registos técnicos e de segurança',
              'Em regra, até 12 meses, salvo incidente ou obrigação de conservação.',
            ],
            [
              'Prova de consentimentos',
              'Durante a utilização e até 5 anos após a retirada ou cessação da finalidade.',
            ],
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'As cópias de segurança são substituídas segundo um ciclo técnico limitado. Quando um dado é apagado dos sistemas ativos, poderá subsistir temporariamente numa cópia de segurança até à respetiva substituição, sem voltar a ser usado para fins correntes.',
        },
      ],
    },
    {
      numero: '11',
      titulo: 'Apagamento da conta',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O titular pode pedir ou executar o encerramento da conta. O encerramento elimina o acesso, as credenciais e os dados que deixem de ser necessários. Não significa necessariamente o apagamento imediato de todos os registos: informação contabilística, pagamentos e outros elementos necessários ao cumprimento da lei ou à defesa de direitos podem ser conservados pelos prazos aplicáveis. O histórico de presenças e matrícula será eliminado ou anonimizado quando terminar o prazo definido e não existir fundamento para conservação adicional.',
        },
      ],
    },
    {
      numero: '12',
      titulo: 'Direitos',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Nos termos legais, o titular pode solicitar acesso, retificação, apagamento, limitação, oposição e portabilidade, bem como retirar um consentimento sem afetar a licitude do tratamento anterior. O pedido deve ser enviado para geral@centroculturalguarda.pt. O CCG poderá pedir informação estritamente necessária para confirmar a identidade e responderá, em regra, no prazo de um mês.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O titular pode ainda apresentar reclamação à Comissão Nacional de Proteção de Dados, em www.cnpd.pt.',
        },
      ],
    },
    {
      numero: '13',
      titulo: 'Segurança e incidentes',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O CCG aplica controlo de acessos por função, autenticação, regras de segurança na base de dados, cópias de segurança e medidas organizativas adequadas. Se ocorrer uma violação de dados pessoais suscetível de gerar risco, o CCG seguirá os deveres legais de registo, avaliação, notificação à CNPD e, quando aplicável, comunicação aos titulares afetados.',
        },
      ],
    },
    {
      numero: '14',
      titulo: 'Alterações',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Esta Política pode ser atualizada. Alterações relevantes serão comunicadas na aplicação ou por outro meio adequado. Uma atualização informativa da Política não transforma o tratamento em consentimento nem exige aceitação automática; quando uma nova utilização depender de consentimento, este será pedido separadamente.',
        },
      ],
    },
  ],
}
