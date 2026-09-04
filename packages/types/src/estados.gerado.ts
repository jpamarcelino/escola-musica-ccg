// GERADO — não editar à mão.
//
// Produzido a partir de supabase/schema.sql e das migrações, aplicadas
// por ordem. Para regenerar depois de uma migração nova:
//
//     pnpm --filter @ccg/types gerar
//
// Há um teste que repete a extração e compara com este ficheiro, por
// isso uma migração que mude os valores permitidos e se esqueça de
// regenerar faz falhar a suite em vez de divergir em silêncio.

// aceitacoes_legais.accao — fixado em 0052_documentos_legais.sql
export type AceitacoesLegaiAccao = 'aceite' | 'visto'

export const ACEITACOESLEGAIACCAO_VALORES = [
  'aceite',
  'visto',
] as const satisfies readonly AceitacoesLegaiAccao[]

// aceitacoes_legais.origem — fixado em 0052_documentos_legais.sql
export type AceitacoesLegaiOrigem = 'web' | 'mobile'

export const ACEITACOESLEGAIORIGEM_VALORES = [
  'web',
  'mobile',
] as const satisfies readonly AceitacoesLegaiOrigem[]

// aulas_desmarcadas.origem — fixado em 0031_cancelamentos_e_reposicoes.sql
export type AulasDesmarcadaOrigem = 'aluno' | 'professor'

export const AULASDESMARCADAORIGEM_VALORES = [
  'aluno',
  'professor',
] as const satisfies readonly AulasDesmarcadaOrigem[]

// aulas_desmarcadas.reposicao_estado — fixado em 0031_cancelamentos_e_reposicoes.sql
export type AulasDesmarcadaReposicaoEstado = 'sem_pedido' | 'por_repor' | 'pendente' | 'agendada' | 'nao_possivel' | 'expirada'

export const AULASDESMARCADAREPOSICAOESTADO_VALORES = [
  'sem_pedido',
  'por_repor',
  'pendente',
  'agendada',
  'nao_possivel',
  'expirada',
] as const satisfies readonly AulasDesmarcadaReposicaoEstado[]

// beneficios.estado — fixado em 0024_programa_recomendacao.sql
export type BeneficioEstado = 'pendente' | 'usado' | 'expirado' | 'anulado'

export const BENEFICIOESTADO_VALORES = [
  'pendente',
  'usado',
  'expirado',
  'anulado',
] as const satisfies readonly BeneficioEstado[]

// convites.programa — fixado em 0016_convites.sql
export type ConvitePrograma = 'musica' | 'danca'

export const CONVITEPROGRAMA_VALORES = [
  'musica',
  'danca',
] as const satisfies readonly ConvitePrograma[]

// convites.tipo — fixado em 0016_convites.sql
export type ConviteTipo = 'professor' | 'admin' | 'migracao_aluno'

export const CONVITETIPO_VALORES = [
  'professor',
  'admin',
  'migracao_aluno',
] as const satisfies readonly ConviteTipo[]

// documentos_legais.tipo — fixado em 0052_documentos_legais.sql
export type DocumentosLegaiTipo = 'privacidade' | 'termos' | 'cookies' | 'informacao'

export const DOCUMENTOSLEGAITIPO_VALORES = [
  'privacidade',
  'termos',
  'cookies',
  'informacao',
] as const satisfies readonly DocumentosLegaiTipo[]

// horarios_reposicao.estado — fixado em 0031_cancelamentos_e_reposicoes.sql
export type HorariosReposicaoEstado = 'disponivel' | 'ocupado'

export const HORARIOSREPOSICAOESTADO_VALORES = [
  'disponivel',
  'ocupado',
] as const satisfies readonly HorariosReposicaoEstado[]

// horarios.dia_semana — fixado em schema.sql
export type HorarioDiaSemana = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo'

export const HORARIODIASEMANA_VALORES = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const satisfies readonly HorarioDiaSemana[]

// horarios.estado — fixado em schema.sql
export type HorarioEstado = 'aberto' | 'bloqueado'

export const HORARIOESTADO_VALORES = [
  'aberto',
  'bloqueado',
] as const satisfies readonly HorarioEstado[]

// indicacoes_recomendacao.estado — fixado em 0026_indicacoes_de_recomendacao.sql
export type IndicacoesRecomendacaoEstado = 'por_confirmar' | 'confirmada' | 'recusada'

export const INDICACOESRECOMENDACAOESTADO_VALORES = [
  'por_confirmar',
  'confirmada',
  'recusada',
] as const satisfies readonly IndicacoesRecomendacaoEstado[]

// instrumentos.programa — fixado em 0023_musica_bebes.sql
export type InstrumentoPrograma = 'musica' | 'danca' | 'bebes'

export const INSTRUMENTOPROGRAMA_VALORES = [
  'musica',
  'danca',
  'bebes',
] as const satisfies readonly InstrumentoPrograma[]

// materiais.tipo — fixado em 0049_partituras.sql
export type MateriaiTipo = 'video' | 'partitura'

export const MATERIAITIPO_VALORES = [
  'video',
  'partitura',
] as const satisfies readonly MateriaiTipo[]

// matriculas.estado — fixado em 0029_cancelar_matricula.sql
export type MatriculaEstado = 'a_escolher' | 'confirmado' | 'cancelado'

export const MATRICULAESTADO_VALORES = [
  'a_escolher',
  'confirmado',
  'cancelado',
] as const satisfies readonly MatriculaEstado[]

// mensagens_escola.filtro — fixado em 0042_mensagens_da_escola.sql
export type MensagensEscolaFiltro = 'todos' | 'por_professor' | 'por_escola' | 'selecionados'

export const MENSAGENSESCOLAFILTRO_VALORES = [
  'todos',
  'por_professor',
  'por_escola',
  'selecionados',
] as const satisfies readonly MensagensEscolaFiltro[]

// mensagens_escola.publico — fixado em 0042_mensagens_da_escola.sql
export type MensagensEscolaPublico = 'alunos' | 'professores'

export const MENSAGENSESCOLAPUBLICO_VALORES = [
  'alunos',
  'professores',
] as const satisfies readonly MensagensEscolaPublico[]

// notificacoes.tipo — fixado em 0064_fixar_tipos_de_notificacao.sql
export type NotificacaoTipo = 'pedido_aceite' | 'lembrete_aula' | 'lembrete_pagamento' | 'mudanca_horario' | 'novo_material' | 'matricula_cancelada' | 'aula_desmarcada' | 'reposicao_pedida' | 'reposicao_agendada' | 'reposicao_nao_possivel' | 'reposicao_sem_opcoes' | 'reposicao_expirada' | 'reposicao_lembrete' | 'proposta_horario' | 'proposta_aceite' | 'proposta_recusada' | 'reposicao_proposta' | 'reposicao_proposta_recusada' | 'disciplina_pedida' | 'disciplina_aceite' | 'disciplina_recusada' | 'mensagem_escola' | 'pedido_aula' | 'reposicao_cancelada' | 'turma_bebes_alterada'

export const NOTIFICACAOTIPO_VALORES = [
  'pedido_aceite',
  'lembrete_aula',
  'lembrete_pagamento',
  'mudanca_horario',
  'novo_material',
  'matricula_cancelada',
  'aula_desmarcada',
  'reposicao_pedida',
  'reposicao_agendada',
  'reposicao_nao_possivel',
  'reposicao_sem_opcoes',
  'reposicao_expirada',
  'reposicao_lembrete',
  'proposta_horario',
  'proposta_aceite',
  'proposta_recusada',
  'reposicao_proposta',
  'reposicao_proposta_recusada',
  'disciplina_pedida',
  'disciplina_aceite',
  'disciplina_recusada',
  'mensagem_escola',
  'pedido_aula',
  'reposicao_cancelada',
  'turma_bebes_alterada',
] as const satisfies readonly NotificacaoTipo[]

// pedidos_instrumento.estado — fixado em 0040_pedidos_de_disciplina.sql
export type PedidosInstrumentoEstado = 'pendente' | 'aceite' | 'recusado'

export const PEDIDOSINSTRUMENTOESTADO_VALORES = [
  'pendente',
  'aceite',
  'recusado',
] as const satisfies readonly PedidosInstrumentoEstado[]

// pedidos_reposicao.estado — fixado em 0031_cancelamentos_e_reposicoes.sql
export type PedidosReposicaoEstado = 'pendente' | 'agendada' | 'nao_possivel' | 'expirada'

export const PEDIDOSREPOSICAOESTADO_VALORES = [
  'pendente',
  'agendada',
  'nao_possivel',
  'expirada',
] as const satisfies readonly PedidosReposicaoEstado[]

// perfis_escola.programa — fixado em 0021_generalizar_perfis_escola.sql
export type PerfisEscolaPrograma = 'musica' | 'danca'

export const PERFISESCOLAPROGRAMA_VALORES = [
  'musica',
  'danca',
] as const satisfies readonly PerfisEscolaPrograma[]

// perfis_escola.tipo — fixado em 0025_conta_ccg_separada_de_alunos.sql
export type PerfisEscolaTipo = 'conta' | 'professor' | 'admin'

export const PERFISESCOLATIPO_VALORES = [
  'conta',
  'professor',
  'admin',
] as const satisfies readonly PerfisEscolaTipo[]

// presencas.estado — fixado em 0031_cancelamentos_e_reposicoes.sql
export type PresencaEstado = 'presente' | 'falta_aviso' | 'falta_sem_aviso' | 'falta_professor'

export const PRESENCAESTADO_VALORES = [
  'presente',
  'falta_aviso',
  'falta_sem_aviso',
  'falta_professor',
] as const satisfies readonly PresencaEstado[]

// profiles.programa — fixado em schema.sql
export type ProfilePrograma = 'musica' | 'danca'

export const PROFILEPROGRAMA_VALORES = [
  'musica',
  'danca',
] as const satisfies readonly ProfilePrograma[]

// profiles.tipo — fixado em 0009_tipo_admin.sql
export type ProfileTipo = 'aluno' | 'professor' | 'admin'

export const PROFILETIPO_VALORES = [
  'aluno',
  'professor',
  'admin',
] as const satisfies readonly ProfileTipo[]

// propostas_horario.estado — fixado em 0037_propostas_de_horario.sql
export type PropostasHorarioEstado = 'pendente' | 'aceite' | 'recusada' | 'cancelada'

export const PROPOSTASHORARIOESTADO_VALORES = [
  'pendente',
  'aceite',
  'recusada',
  'cancelada',
] as const satisfies readonly PropostasHorarioEstado[]

// recomendacoes.estado — fixado em 0024_programa_recomendacao.sql
export type RecomendacaoEstado = 'registada' | 'validada' | 'anulada'

export const RECOMENDACAOESTADO_VALORES = [
  'registada',
  'validada',
  'anulada',
] as const satisfies readonly RecomendacaoEstado[]

// reposicoes.estado — fixado em 0039_reposicao_marcada_e_uma_proposta.sql
export type ReposicaoEstado = 'proposta' | 'confirmada' | 'recusada'

export const REPOSICAOESTADO_VALORES = [
  'proposta',
  'confirmada',
  'recusada',
] as const satisfies readonly ReposicaoEstado[]

// turmas_bebes.dia_semana — fixado em 0059_escola_de_bebes.sql
export type TurmasBebeDiaSemana = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo'

export const TURMASBEBEDIASEMANA_VALORES = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const satisfies readonly TurmasBebeDiaSemana[]
