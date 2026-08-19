// O calendário do ano letivo: que dias são de aulas e que dias não são.
//
// Até aqui, a app assumia que todas as semanas são iguais — a grelha é
// semanal e "a próxima aula" é sempre calculada a partir do dia da
// semana. Isso mostra aulas no dia 25 de dezembro. Este ficheiro é a
// lista de exceções do calendário civil e escolar, e é a mesma para toda
// a gente: alunos, famílias e professores veem o mesmo ano letivo.
//
// Fica no core, e não numa tabela, por uma razão: nada disto muda sem
// alguém decidir, e uma decisão da escola merece uma alteração revista e
// publicada, não uma linha escrita à pressa numa noite de inscrições.
// Quando a secretaria quiser mexer nisto sozinha, passa a tabela — o
// resto do código só fala com as funções daqui.

export type EstadoDia =
  | 'aula'
  | 'fim_de_semana'
  | 'feriado'
  | 'interrupcao'
  | 'fora_do_ano'

export type DiaDoCalendario = {
  data: string
  estado: EstadoDia
  // O nome da razão, quando há uma: "Natal", "Interrupção do Natal".
  // Só os feriados e as interrupções têm; um sábado é só um sábado.
  motivo?: string
}

// Ano letivo 2026/2027. Começa a 1 de outubro (ou no dia útil seguinte,
// se calhar em fim de semana ou feriado) e acaba a 30 de junho (ou no
// dia útil anterior).
const INICIO_NOMINAL = '2026-10-01'
const FIM_NOMINAL = '2027-06-30'

// O calendário mostra-se de setembro a agosto: setembro é o mês das
// inscrições e agosto o das aulas de verão, e ambos aparecem — a cinzento,
// porque não são dias de aulas do ano letivo.
export const PRIMEIRO_MES = { ano: 2026, mes: 9 }
export const ULTIMO_MES = { ano: 2027, mes: 8 }

export type Interrupcao = { nome: string; inicio: string; fim: string }

// As interrupções (Natal, Carnaval, Páscoa) ainda não estão decididas
// pela escola. Enquanto a lista estiver vazia, o calendário mostra esses
// dias como dias de aulas — que é o que são até alguém dizer o
// contrário. Acrescentar aqui chega para o calendário inteiro mudar.
export const INTERRUPCOES: Interrupcao[] = []

function paraISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function deISO(data: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function somarDias(data: string, dias: number): string {
  const d = deISO(data)
  d.setDate(d.getDate() + dias)
  return paraISO(d)
}

// Domingo de Páscoa pelo algoritmo de Meeus/Butcher. Calculado e não
// escrito à mão porque metade dos feriados portugueses dependem dele e
// mudam todos os anos — uma tabela fixa envelhecia em silêncio no ano
// seguinte.
export function domingoDePascoa(ano: number): string {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// Feriados obrigatórios em Portugal, mais o feriado municipal da Guarda
// (27 de novembro), que é onde a escola está e onde fecha.
//
// O Carnaval não está aqui de propósito: é tolerância de ponto, não
// feriado. Se a escola fechar, entra como interrupção — que é o que de
// facto é.
export function feriados(ano: number): Map<string, string> {
  const pascoa = domingoDePascoa(ano)
  return new Map([
    [`${ano}-01-01`, 'Ano Novo'],
    [somarDias(pascoa, -2), 'Sexta-feira Santa'],
    [pascoa, 'Páscoa'],
    [`${ano}-04-25`, 'Dia da Liberdade'],
    [`${ano}-05-01`, 'Dia do Trabalhador'],
    [somarDias(pascoa, 60), 'Corpo de Deus'],
    [`${ano}-06-10`, 'Dia de Portugal'],
    [`${ano}-08-15`, 'Assunção de Nossa Senhora'],
    [`${ano}-10-05`, 'Implantação da República'],
    [`${ano}-11-01`, 'Todos os Santos'],
    [`${ano}-11-27`, 'Feriado municipal da Guarda'],
    [`${ano}-12-01`, 'Restauração da Independência'],
    [`${ano}-12-08`, 'Imaculada Conceição'],
    [`${ano}-12-25`, 'Natal'],
  ])
}

function ehFimDeSemana(data: string): boolean {
  const dia = deISO(data).getDay()
  return dia === 0 || dia === 6
}

function ehDiaUtil(data: string): boolean {
  if (ehFimDeSemana(data)) return false
  return !feriados(Number(data.slice(0, 4))).has(data)
}

// "1 de outubro ou no dia útil mais próximo seguinte" — e o simétrico
// para o fim. O calendário nunca começa nem acaba num dia em que a
// escola está fechada.
function ajustar(data: string, direcao: 1 | -1): string {
  let atual = data
  for (let i = 0; i < 14; i += 1) {
    if (ehDiaUtil(atual)) return atual
    atual = somarDias(atual, direcao)
  }
  return atual
}

export const ANO_LETIVO_INICIO = ajustar(INICIO_NOMINAL, 1)
export const ANO_LETIVO_FIM = ajustar(FIM_NOMINAL, -1)

export function estadoDoDia(data: string): DiaDoCalendario {
  if (data < ANO_LETIVO_INICIO || data > ANO_LETIVO_FIM) {
    return { data, estado: 'fora_do_ano' }
  }
  if (ehFimDeSemana(data)) return { data, estado: 'fim_de_semana' }

  const feriado = feriados(Number(data.slice(0, 4))).get(data)
  if (feriado) return { data, estado: 'feriado', motivo: feriado }

  const interrupcao = INTERRUPCOES.find((i) => data >= i.inicio && data <= i.fim)
  if (interrupcao) return { data, estado: 'interrupcao', motivo: interrupcao.nome }

  return { data, estado: 'aula' }
}

export function ehDiaDeAulas(data: string): boolean {
  return estadoDoDia(data).estado === 'aula'
}

// Todos os dias de aulas do ano letivo, por ordem. É a lista sobre a qual
// se espalham os horários semanais para saber em que dias concretos cada
// aluno tem aula.
export function diasDeAulas(): string[] {
  const dias: string[] = []
  let atual = ANO_LETIVO_INICIO
  while (atual <= ANO_LETIVO_FIM) {
    if (ehDiaDeAulas(atual)) dias.push(atual)
    atual = somarDias(atual, 1)
  }
  return dias
}

export type MesDoCalendario = {
  ano: number
  mes: number
  label: string
  // Semanas de domingo a sábado, como nos calendários de parede
  // portugueses. (O resto da app conta as semanas de segunda a domingo,
  // porque é a ordem dos dias de aulas; aqui o que conta é a leitura.)
  // As casas antes do dia 1 e depois do último dia são `null` — o mês tem
  // de encaixar numa grelha, e um espaço vazio é diferente de um dia
  // cinzento.
  semanas: (DiaDoCalendario | null)[][]
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function mesDoCalendario(ano: number, mes: number): MesDoCalendario {
  const primeiro = new Date(ano, mes - 1, 1)
  const totalDias = new Date(ano, mes, 0).getDate()
  // getDay() já dá 0=domingo, que é a primeira coluna.
  const deslocamento = primeiro.getDay()

  const casas: (DiaDoCalendario | null)[] = Array(deslocamento).fill(null)
  for (let dia = 1; dia <= totalDias; dia += 1) {
    casas.push(estadoDoDia(paraISO(new Date(ano, mes - 1, dia))))
  }
  while (casas.length % 7 !== 0) casas.push(null)

  const semanas: (DiaDoCalendario | null)[][] = []
  for (let i = 0; i < casas.length; i += 7) semanas.push(casas.slice(i, i + 7))

  return { ano, mes, label: NOMES_MES[mes - 1], semanas }
}

// Os doze meses do calendário, de setembro a agosto.
export function mesesDoCalendario(): MesDoCalendario[] {
  const meses: MesDoCalendario[] = []
  let ano = PRIMEIRO_MES.ano
  let mes = PRIMEIRO_MES.mes
  for (let i = 0; i < 12; i += 1) {
    meses.push(mesDoCalendario(ano, mes))
    mes += 1
    if (mes === 13) {
      mes = 1
      ano += 1
    }
  }
  return meses
}
