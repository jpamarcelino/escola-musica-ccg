import type { DocumentoLegal } from './tipos'

export const TERMOS: DocumentoLegal = {
  tipo: 'termos',
  caminho: '/legal/termos',
  titulo: 'Termos de Utilização e Regras do Serviço',
  resumo: 'As regras de utilização da app e do serviço: pedidos, matrículas, horários, pagamentos, faltas e cancelamentos.',
  versao: '1.0',
  elaboradoEm: '2026-08-21',
  entradaEmVigor: null,
  seccoes: [
    {
      numero: '1',
      titulo: 'Objeto',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Estes Termos regulam o acesso à aplicação das Escolas Artísticas do Centro Cultural da Guarda e estabelecem regras gerais para pedidos de aula, matrículas, horários, pagamentos, faltas, cancelamentos e utilização das funcionalidades digitais. Regras específicas comunicadas no momento da matrícula complementam estes Termos.',
        },
      ],
    },
    {
      numero: '2',
      titulo: 'Operador',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A aplicação é disponibilizada pelo Centro Cultural da Guarda, NIPC 501 430 881, Rua Alves Roçadas — Paço da Cultura, 6300-663 Guarda, contacto geral@centroculturalguarda.pt e 961 384 075.',
        },
      ],
    },
    {
      numero: '3',
      titulo: 'Conta CCG e idade mínima',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Conta CCG destina-se a pessoas com 18 ou mais anos. Pode ser utilizada por um aluno adulto para gerir a própria frequência ou por um encarregado para gerir um ou mais alunos dependentes. Contas de professor ou administração são criadas apenas mediante convite ou autorização do CCG.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O titular é responsável pela veracidade e atualização dos dados, pela confidencialidade da password e pela atividade realizada através da sua conta. Deve comunicar de imediato qualquer acesso não autorizado.',
        },
      ],
    },
    {
      numero: '4',
      titulo: 'Perfis de aluno',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Um perfil de aluno não é uma conta autónoma e não possui password. Ao criar um perfil de menor, o titular declara possuir responsabilidade parental, ser encarregado de educação ou ter outra legitimidade bastante para gerir os respetivos dados e a relação com o CCG.',
        },
      ],
    },
    {
      numero: '5',
      titulo: 'Pedido de aula e formação da matrícula',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A submissão de um pedido na aplicação constitui um pedido de contacto e disponibilidade, não uma confirmação automática de vaga nem, por si só, a conclusão da matrícula. O aluno pode indicar vários horários possíveis ou deixar uma mensagem quando não existam horários disponíveis.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A matrícula e o horário apenas se consideram confirmados quando o professor ou o CCG aceita uma opção e comunica a confirmação. Antes de ficar vinculado ao pagamento, o utilizador deve receber informação sobre preço, duração, periodicidade, taxas aplicáveis e regras específicas da modalidade.',
        },
      ],
    },
    {
      numero: '6',
      titulo: 'Horários, calendário e salas',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Os horários dependem da disponibilidade dos professores, das salas e do calendário do CCG. A indicação de disponibilidade pelo utilizador não reserva definitivamente o horário. O CCG pode propor alterações justificadas, procurando comunicar com antecedência razoável e reduzir prejuízos para o aluno.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Feriados, pausas letivas, encerramentos e eventos extraordinários serão comunicados através da aplicação, email, telefone ou outro canal usado pela escola.',
        },
      ],
    },
    {
      numero: '7',
      titulo: 'Preços, inscrição, seguro e mensalidades',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Os preços, taxa de inscrição, seguro, periodicidade e meios de pagamento são comunicados antes da confirmação da matrícula. Os valores podem variar por escola, modalidade, duração ou ano letivo. Uma alteração de preço não produz efeitos retroativos e será comunicada antes de se aplicar.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Salvo indicação diferente comunicada por escrito, a mensalidade vence-se até ao dia 8 do mês a que respeita. A aplicação pode emitir lembretes e avisos de pagamento. A ausência do aviso não elimina uma obrigação de pagamento já comunicada.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A indicação de “pago” na aplicação depende da confirmação da secretaria e não substitui a fatura ou recibo legalmente aplicável.',
        },
      ],
    },
    {
      numero: '8',
      titulo: 'Programa de Recomendação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Quando disponível, o Programa de Recomendação rege-se pelo respetivo regulamento. Uma indicação feita durante o pedido de aula é apenas informação por confirmar. O benefício só é atribuído depois de verificadas as condições do programa, designadamente matrícula e primeiro pagamento, e pode ser anulado em caso de erro, duplicação, cancelamento ou fraude.',
        },
      ],
    },
    {
      numero: '9',
      titulo: 'Faltas do aluno',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O aluno ou encarregado deve comunicar a falta logo que possível através da funcionalidade disponível ou dos contactos do CCG. Uma falta do aluno não suspende automaticamente a mensalidade.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na Escola de Música, uma falta comunicada antecipadamente pode permitir pedido de reposição, a realizar no prazo máximo de 30 dias e sempre sujeita à disponibilidade do professor, de sala e do calendário. A comunicação da falta não garante, por si só, a existência de horário de reposição.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Nas atividades coletivas, incluindo Dança e Música para Bebés, não existe, em regra, reposição individual de uma falta do aluno, salvo decisão expressa do CCG ou solução própria da modalidade.',
        },
      ],
    },
    {
      numero: '10',
      titulo: 'Cancelamento pelo professor ou pelo CCG',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Quando uma aula individual é cancelada pelo professor ou pelo CCG, será procurada uma nova data dentro de prazo razoável. Se a reposição não for possível, o CCG aplicará a solução legal e contratualmente adequada, que poderá incluir crédito, acerto ou devolução proporcional.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Em atividades coletivas, o CCG pode reorganizar a aula, substituir o professor ou adotar solução equivalente, informando os participantes.',
        },
      ],
    },
    {
      numero: '11',
      titulo: 'Cancelamento de pedidos e desistência',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Um pedido ainda não confirmado pode ser cancelado na aplicação sem encargos relativos a aulas futuras. A desistência de uma matrícula confirmada deve ser comunicada através da aplicação ou diretamente ao CCG e só produz efeitos após receção e processamento da comunicação.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Os montantes vencidos e serviços já prestados continuam devidos. O CCG não cobrará mensalidades posteriores à data em que a desistência produza efeitos, sem prejuízo de uma regra de pré-aviso que tenha sido claramente comunicada e validamente acordada.',
        },
      ],
    },
    {
      numero: '12',
      titulo: 'Contratos à distância e direitos do consumidor',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A aplicação distingue o simples pedido de aula da confirmação da matrícula. Quando a contratação seja concluída à distância, o CCG prestará a informação legalmente exigida e respeitará os direitos do consumidor, incluindo o direito de livre resolução quando aplicável. Se o utilizador pedir que o serviço comece antes do fim de um prazo legal de livre resolução, qualquer declaração adicional necessária será recolhida separadamente.',
        },
      ],
    },
    {
      numero: '13',
      titulo: 'Conduta nas aulas e utilização do serviço',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Alunos, encarregados e utilizadores devem respeitar professores, funcionários, restantes participantes, instalações, instrumentos e equipamentos. Não é permitido usar a aplicação para assédio, fraude, acesso indevido, partilha ilícita de dados ou perturbação do funcionamento da escola.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O utilizador responde por danos causados de forma ilícita ou negligente, nos termos gerais da lei. O CCG pode restringir uma conta ou participação em caso de risco, abuso grave ou incumprimento, garantindo informação e possibilidade de esclarecimento sempre que as circunstâncias o permitam.',
        },
      ],
    },
    {
      numero: '14',
      titulo: 'Materiais, imagem e propriedade intelectual',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Os materiais disponibilizados pelos professores ou pelo CCG destinam-se ao uso pedagógico do aluno e não podem ser publicados, vendidos ou distribuídos sem autorização. A aplicação, identidade visual, textos e conteúdos pertencem aos respetivos titulares.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A gravação ou divulgação de aulas, professores ou alunos depende de autorização e do respeito pelos direitos de imagem e proteção de dados.',
        },
      ],
    },
    {
      numero: '15',
      titulo: 'Disponibilidade e alterações técnicas',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O CCG procura manter a aplicação disponível e segura, mas pode realizar manutenção, corrigir erros ou suspender temporariamente funcionalidades. Uma falha da aplicação não impede o utilizador de contactar a secretaria pelos meios indicados.',
        },
      ],
    },
    {
      numero: '16',
      titulo: 'Responsabilidade',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Nada nestes Termos exclui responsabilidade ou direitos que a lei não permita excluir. O CCG não responde por indisponibilidade causada por força maior, falhas externas inevitáveis ou utilização contrária às instruções, sem prejuízo dos deveres de diligência e segurança que lhe cabem.',
        },
      ],
    },
    {
      numero: '17',
      titulo: 'Alterações aos Termos',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Os Termos têm número de versão e data de entrada em vigor. Alterações materiais serão comunicadas com resumo e poderão exigir nova aceitação antes da utilização normal da aplicação. Alterações meramente editoriais ou favoráveis podem ser comunicadas sem nova aceitação.',
        },
      ],
    },
    {
      numero: '18',
      titulo: 'Encerramento da conta',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O titular pode encerrar a conta através da aplicação ou dos contactos do CCG. O encerramento retira o acesso, mas não elimina registos que devam ser conservados por obrigação legal ou defesa de direitos. Antes de encerrar uma conta que gere menores, o titular deve avaliar se é necessário transferir a gestão dos perfis para outro responsável.',
        },
      ],
    },
    {
      numero: '19',
      titulo: 'Reclamações e resolução de litígios',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Para esclarecimentos ou reclamações, o utilizador pode contactar geral@centroculturalguarda.pt ou 961 384 075. O CCG disponibilizará acesso ao Livro de Reclamações Eletrónico após a conclusão do respetivo registo.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A entidade de resolução alternativa de litígios territorialmente competente para a Guarda é o CNIACC — Centro Nacional de Informação e Arbitragem de Conflitos de Consumo, disponível em www.cniacc.pt. O recurso a mecanismos de resolução alternativa não elimina o direito de recorrer aos tribunais.',
        },
      ],
    },
    {
      numero: '20',
      titulo: 'Lei aplicável',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Aplica-se a lei portuguesa, sem prejuízo das normas imperativas de proteção do consumidor e da competência dos tribunais determinada pela lei.',
        },
      ],
    },
  ],
}
