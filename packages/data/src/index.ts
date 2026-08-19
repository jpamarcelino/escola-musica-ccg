// Leituras da base de dados que a web e a app móvel podem partilhar.
//
// O contrato do pacote está em cliente.ts e resume-se a uma frase: as
// funções recebem o cliente Supabase, nunca o criam. É isso que as torna
// partilháveis e é isso que impede a `service role key` de aqui entrar.
//
// O que ainda NÃO está aqui são as escritas. As 48 Server Actions da web
// estão construídas à volta do `redirect` e do `revalidatePath` do Next —
// não são funções de dados com um efeito, são o efeito. Separá-las exige
// decidir o que a app móvel faz no lugar de uma navegação do servidor, e
// essa decisão pertence à fase da app móvel, não a esta.

export type { ClienteCcg } from './cliente'

export { listarAlunosDoEncarregado } from './alunos'
export type { AlunoResumo } from './alunos'

export {
  recolherDadosEstudo,
  recolherDesempenhoPorProfessor,
  estudoParaCsv,
} from './estudo-recomendacoes'
export type { LinhaEstudo, TotaisEstudo, DesempenhoProfessor } from './estudo-recomendacoes'

export {
  listarMatriculasDoAluno,
  contarNotificacoesPorLer,
  listarNotificacoes,
} from './matriculas'
export type { MatriculaDoAluno, Notificacao } from './matriculas'

export { obterPerfilEscola, ehContaCcg, ehProfessor } from './perfil'
export type { PerfilEscola } from './perfil'

export {
  listarAulasDoProfessor,
  listarHorariosDoProfessor,
  listarPedidosPendentes,
  matriculasComPresencaMarcada,
} from './professor'
export type { AulaDoProfessor, HorarioDoProfessor, PedidoPendente } from './professor'

export { listarMatriculasParaCobranca, listarMensalidadesDoMes } from './mensalidades'
export type { MatriculaParaCobranca, MensalidadeDoMes } from './mensalidades'

export { listarAlunosDoHorario, presencasDaData } from './professor'
export type { AlunoDaAula } from './professor'

export {
  marcarPresencas,
  confirmarPedido,
  recusarPedido,
  alternarEstadoHorario,
} from './escritas-professor'
export type { Resultado, MarcacaoPresenca } from './escritas-professor'

export {
  criarAluno,
  pedirAula,
  cancelarPedido,
  marcarNotificacaoLida,
  marcarTodasLidas,
} from './escritas-encarregado'

export {
  listarInstrumentos,
  listarProfessoresDoInstrumento,
  listarHorariosPublicos,
} from './oferta'
export type { Instrumento, ProfessorPublico, HorarioPublico } from './oferta'

export {
  atualizarNome,
  atualizarEmail,
  atualizarPassword,
  apagarPropriaConta,
} from './conta'

export {
  numerosDaEscola,
  listarTodosAlunos,
  listarProfessores,
  listarRecomendacoes,
  validarRecomendacao,
  anularRecomendacao,
  marcarMensalidadePaga,
} from './admin'
export type {
  NumerosDaEscola,
  AlunoAdmin,
  ProfessorAdmin,
  RecomendacaoAdmin,
} from './admin'
