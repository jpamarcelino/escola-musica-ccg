// Lógica de negócio sem framework: nem React, nem Next, nem DOM, nem
// Supabase. É o que a web e a app móvel vão partilhar literalmente — o
// mesmo ficheiro, não duas cópias que divergem ao terceiro mês.
//
// O critério para uma função entrar aqui é simples: tem de correr sem
// alterações no Node, no browser e no Hermes. O tsconfig deste pacote não
// inclui a lib "dom", por isso quem tentar usar `window` não consegue
// sequer compilar.
//
// Não entra aqui nada que faça queries — isso é o packages/data.

export { DIAS_SEMANA } from './dias-semana'
export type { DiaSemana } from './dias-semana'

export {
  agoraNaEscola,
  dataMaisRecenteDoDia,
  diaSemanaDaData,
  dataEhFutura,
  hojeISO,
  estadoTemporalAula,
  formatarDataEscolar,
  datasDoDia,
  proximaOcorrenciaDoDia,
  proximaOcorrenciaDeAula,
  INICIO_PRESENCAS,
} from './datas'
export type { EstadoTemporalAula } from './datas'
export { proximaAulaPorAcontecer } from './datas'

export { MESES_ANO_LETIVO, rotuloMes } from './ano-letivo'

export {
  ANO_LETIVO_INICIO,
  ANO_LETIVO_FIM,
  INTERRUPCOES,
  diasDeAulas,
  domingoDePascoa,
  ehDiaDeAulas,
  estadoDoDia,
  feriados,
  mesesDoCalendario,
} from './calendario-escolar'
export type { DiaDoCalendario, EstadoDia, Interrupcao, MesDoCalendario } from './calendario-escolar'

export { euros, eurosOuTexto, eurosParaInput } from './moeda'

export { plural, palavra } from './plural'

export { calcularIdade } from './idade'

export { formatarSala } from './sala'
export type { Sala } from './sala'

export { HOUR_HEIGHT, paraMinutos, formatarHora } from './horarios-grade'

export {
  MUSICA_IDADE_MIN,
  MUSICA_IDADE_MAX,
  separarFaixaEtaria,
  parseFaixaEtaria,
  dentroDaFaixa,
  elegivelParaDisciplina,
} from './idade-disciplinas'

export {
  estadoMensalidade,
  ROTULO_MENSALIDADE,
  totalPorReceber,
  parteDoProfessor,
} from './mensalidades'
export type { EstadoMensalidade, MensalidadeParaEstado } from './mensalidades'

export {
  MENSAGEM_CAMPOS_EM_FALTA,
  PASSWORD_MINIMO,
  TELEFONE_MINIMO_DIGITOS,
  validarObrigatorios,
  validarPassword,
  validarTelefone,
  validarNIF,
  normalizarNIF,
  validarDataNascimento,
  validarEmail,
  validarNome,
  validarRegisto,
} from './validacao'
export type { Erro } from './validacao'

export { validarDataDePresenca } from './presencas'
