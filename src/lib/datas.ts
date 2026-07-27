import { DIAS_SEMANA } from '@/lib/dias-semana'

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
  return paraISO(new Date())
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
