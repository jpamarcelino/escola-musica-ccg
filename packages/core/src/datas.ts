import { DIAS_SEMANA } from './dias-semana'

const FUSO_HORARIO_ESCOLA = 'Europe/Lisbon'

// Constrói uma data cujos componentes locais representam a hora da escola,
// independentemente do fuso horário do servidor (por exemplo, UTC na Vercel).
export function agoraNaEscola(instante = new Date()): Date {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSO_HORARIO_ESCOLA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instante)
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((parte) => parte.type === tipo)?.value ?? 0)

  return new Date(
    valor('year'),
    valor('month') - 1,
    valor('day'),
    valor('hour'),
    valor('minute'),
    valor('second')
  )
}

function indiceDoDia(diaSemana: string) {
  return DIAS_SEMANA.indexOf(diaSemana)
}

// JS: getDay() dá 0=Domingo..6=Sábado. Aqui usa-se 0=Segunda..6=Domingo,
// para bater certo com a ordem de DIAS_SEMANA.
function indiceSegundaBase(data: Date) {
  return (data.getDay() + 6) % 7
}

// A data mais recente (hoje incluído) que cai nesse dia da semana — usada
// como valor por omissão ao abrir a marcação de presenças.
export function dataMaisRecenteDoDia(diaSemana: string, referencia = new Date()): string {
  const hoje = new Date(referencia)
  hoje.setHours(0, 0, 0, 0)
  const diff = (indiceSegundaBase(hoje) - indiceDoDia(diaSemana) + 7) % 7
  const data = new Date(hoje)
  data.setDate(data.getDate() - diff)
  return paraISO(data)
}

export function diaSemanaDaData(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  return DIAS_SEMANA[indiceSegundaBase(new Date(ano, mes - 1, dia))]
}

export function dataEhFutura(data: string): boolean {
  return data > hojeISO()
}

export function hojeISO(): string {
  return paraISO(agoraNaEscola())
}

export type EstadoTemporalAula = 'agora' | 'proxima' | 'futura'

export function estadoTemporalAula(
  data: string,
  horaInicio: string,
  horaFim: string,
  referencia = agoraNaEscola()
): EstadoTemporalAula {
  const hoje = paraISO(referencia)
  if (data !== hoje) return 'futura'

  const horaAtual = `${String(referencia.getHours()).padStart(2, '0')}:${String(
    referencia.getMinutes()
  ).padStart(2, '0')}`

  if (horaAtual >= horaInicio.slice(0, 5) && horaAtual < horaFim.slice(0, 5)) {
    return 'agora'
  }

  return 'proxima'
}

// Formata datas ISO sem as converter para UTC. Usar `new Date('2026-08-12')`
// pode mostrar o dia anterior nalguns fusos horários; o meio-dia local evita
// essa alteração e mantém a data escolar intacta.
export function formatarDataEscolar(
  data: string,
  opcoes: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-PT', opcoes).format(
    new Date(ano, mes - 1, dia, 12)
  )
}

// Antes de existir um calendário do ano letivo, as presenças começam a
// contar a partir desta data — sem dar "backfill" de aulas anteriores.
// Quando o calendário ficar pronto, isto é para ser substituído por ele.
export const INICIO_PRESENCAS = '2026-07-27'

// Todas as datas (semanais) desse dia da semana entre "desde" e "ate",
// inclusive — usado para gerar as aulas ainda por confirmar.
export function datasDoDia(diaSemana: string, desde: string, ate: string): string[] {
  const datas: string[] = []
  let atual = dataMaisRecenteDoDiaApartirDe(diaSemana, desde)
  while (atual <= ate) {
    datas.push(atual)
    atual = somarDias(atual, 7)
  }
  return datas
}

// A próxima aula desse dia da semana a partir de hoje (hoje incluído) —
// usada para mostrar a "próxima aula marcada" ao aluno.
export function proximaOcorrenciaDoDia(
  diaSemana: string,
  referencia = agoraNaEscola()
): string {
  return dataMaisRecenteDoDiaApartirDe(diaSemana, paraISO(referencia))
}

// Próxima ocorrência real de uma aula: quando a aula é hoje mas a hora já
// passou, devolve a semana seguinte. A versão que considera apenas o dia é
// útil para calendários; para cards "Próxima aula" esta é a função correta.
export function proximaOcorrenciaDeAula(
  diaSemana: string,
  horaInicio: string,
  horaFim?: string,
  referencia = agoraNaEscola()
): string {
  const candidata = proximaOcorrenciaDoDia(diaSemana, referencia)
  if (candidata !== paraISO(referencia)) return candidata

  const [hora, minuto] = (horaFim ?? horaInicio).split(':').map(Number)
  const limite = new Date(referencia)
  limite.setHours(hora, minuto, 0, 0)

  return limite > referencia ? candidata : somarDias(candidata, 7)
}

// A primeira ocorrência desse dia da semana a partir de (e incluindo) "desde".
function dataMaisRecenteDoDiaApartirDe(diaSemana: string, desde: string): string {
  const [ano, mes, dia] = desde.split('-').map(Number)
  const diff = (indiceDoDia(diaSemana) - indiceSegundaBase(new Date(ano, mes - 1, dia)) + 7) % 7
  return somarDias(desde, diff)
}

function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  d.setDate(d.getDate() + dias)
  return paraISO(d)
}

function paraISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}
