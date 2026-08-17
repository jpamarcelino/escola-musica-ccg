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

// instrumentos.programa — fixado em 0023_musica_bebes.sql
export type InstrumentoPrograma = 'musica' | 'danca' | 'bebes'

export const INSTRUMENTOPROGRAMA_VALORES = [
  'musica',
  'danca',
  'bebes',
] as const satisfies readonly InstrumentoPrograma[]

// matriculas.estado — fixado em schema.sql
export type MatriculaEstado = 'a_escolher' | 'confirmado'

export const MATRICULAESTADO_VALORES = [
  'a_escolher',
  'confirmado',
] as const satisfies readonly MatriculaEstado[]

// notificacoes.tipo — fixado em 0003_notificacoes.sql
export type NotificacaoTipo = 'pedido_aceite' | 'lembrete_aula' | 'lembrete_pagamento' | 'mudanca_horario' | 'novo_material'

export const NOTIFICACAOTIPO_VALORES = [
  'pedido_aceite',
  'lembrete_aula',
  'lembrete_pagamento',
  'mudanca_horario',
  'novo_material',
] as const satisfies readonly NotificacaoTipo[]

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

// presencas.estado — fixado em 0002_presencas.sql
export type PresencaEstado = 'presente' | 'falta_aviso' | 'falta_sem_aviso'

export const PRESENCAESTADO_VALORES = [
  'presente',
  'falta_aviso',
  'falta_sem_aviso',
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

// recomendacoes.estado — fixado em 0024_programa_recomendacao.sql
export type RecomendacaoEstado = 'registada' | 'validada' | 'anulada'

export const RECOMENDACAOESTADO_VALORES = [
  'registada',
  'validada',
  'anulada',
] as const satisfies readonly RecomendacaoEstado[]
