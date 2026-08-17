const NOMES_MES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

// Histórico de mensalidades: setembro de 2026 a agosto de 2027.
export const MESES_ANO_LETIVO: { ano: number; mes: number; label: string }[] = [
  ...[9, 10, 11, 12].map((mes) => ({ ano: 2026, mes, label: NOMES_MES[mes - 1] })),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((mes) => ({ ano: 2027, mes, label: NOMES_MES[mes - 1] })),
]

// "Setembro de 2026" — para nomear uma célula em texto corrido, onde o
// cabeçalho da coluna não chega. Na tabela do histórico os cabeçalhos
// estão em duas linhas (mês em cima, "Valor"/"Nº fatura" em baixo) e
// essa associação implícita não sobrevive na maioria dos leitores de
// ecrã: cada campo tem de dizer de quem e de quando é.
export function rotuloMes(ano: number, mes: number): string {
  return `${NOMES_MES[mes - 1]} de ${ano}`
}
