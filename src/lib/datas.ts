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
  return data > paraISO(new Date())
}

function paraISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}
