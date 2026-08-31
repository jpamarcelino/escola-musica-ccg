// Os textos de interface do Pacote Jurídico v1, num sítio só.
//
// Estão em @ccg/core, e não em cada app, por uma razão concreta: a app
// móvel prometia que o apagamento da conta destruía "alunos, matrículas e
// histórico de presenças, sem cópia", e a base conserva presenças e
// mensalidades. A web dizia outra coisa. Duas cópias de um texto com
// efeitos jurídicos divergem sempre — a única forma de não divergirem é
// não haver duas.
//
// Transcritos do documento. Não se reescrevem para caber num ecrã: se não
// couberem, muda-se o ecrã.

export const TEXTOS_LEGAIS = {
  // Registo da Conta CCG — checkbox obrigatória e desmarcada.
  aceitarTermos: 'Li e aceito os Termos de Utilização e as Regras do Serviço.',

  // Informativo, SEM checkbox. A Política de Privacidade não se "aceita":
  // informa-se. Uma checkbox aqui transformaria em consentimento um
  // tratamento que assenta em contrato e obrigação legal, e um
  // consentimento assim seria inválido — não é livre nem específico.
  privacidadeInformativo:
    'Consulta a Política de Privacidade para saberes como o Centro Cultural da Guarda utiliza os teus dados.',

  avisoIdade:
    'A Conta CCG destina-se a maiores de 18 anos. Para inscrever um menor, a conta deve ser criada pelo respetivo encarregado ou representante legítimo.',

  // Criação de perfil de aluno.
  declaracaoPerfilAluno:
    'Declaro que sou o próprio aluno ou que tenho legitimidade para gerir este perfil e os respetivos dados.',

  // O mesmo pedido, quando quem submete não passou pela checkbox. O
  // texto é uma só frase, e não a declaração inteira outra vez: quem lê
  // isto está a olhar para o formulário, com a declaração à frente.
  erroDeclaracaoPerfilAluno:
    'Para criar um perfil de aluno para outra pessoa, tens de declarar que tens legitimidade para gerir este perfil.',

  porqueDataNascimento:
    'Usamos a data de nascimento para confirmar que as modalidades escolhidas são adequadas à idade do aluno.',

  // Afinador — mostrado ANTES de se pedir o microfone, e outra vez numa
  // ajuda dentro da ferramenta.
  //
  // Não está na Política de Privacidade porque essa é versionada e o seu
  // hash está fixado em código e gravado em documentos_legais: mexer-lhe
  // sem subir a versão parte a verificação. Fica aqui, no ponto de
  // recolha, que é onde a informação tem de estar de qualquer forma —
  // e a política ganha uma secção quando houver uma v1.1.
  microfoneAfinador:
    'O afinador utiliza o microfone apenas enquanto está ativo. O áudio é processado localmente no dispositivo e não é gravado, guardado ou enviado para o Centro Cultural da Guarda ou para terceiros.',

  // Atualização MATERIAL dos Termos — bloqueia até aceitar.
  termosAtualizados:
    'Atualizámos os Termos de Utilização. Consulta o resumo das alterações e a versão completa antes de continuares. Ao selecionar “Aceitar e continuar”, ficas vinculado à nova versão a partir da data indicada.',

  // Atualização da Política — avisa, não bloqueia, e nunca diz "Aceito".
  privacidadeAtualizada:
    'Atualizámos a Política de Privacidade para explicar melhor como tratamos os dados. Consulta as alterações.',

  // Encerramento da conta. O MESMO texto na web e na app móvel.
  apagarConta:
    'Apagar a conta retira o teu acesso e elimina os dados que já não sejam necessários. Alguns registos, como pagamentos, faturação e informação necessária para cumprir a lei ou defender direitos, podem ser conservados durante o prazo aplicável. Esta ação não pode ser anulada.',
} as const

// A idade mínima para ter Conta CCG. Os menores não têm login: são
// geridos através de um perfil de aluno criado por quem os representa.
export const IDADE_MINIMA_CONTA = 18
