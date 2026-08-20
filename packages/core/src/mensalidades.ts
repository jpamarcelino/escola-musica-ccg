// O estado de uma mensalidade não é uma coluna: é o resultado de olhar
// para quatro campos por uma ordem determinada. Estava escrito à mão na
// página /dashboard/mensalidades da web e teria de ser reescrito na app —
// duas cópias de uma regra sobre dinheiro é como se começa a cobrar a
// mais a alguém.
//
// A ordem importa e não é arbitrária:
//
//   1. sem linha        a mensalidade do mês ainda não foi gerada
//   2. desistência      quem desistiu não deve, mesmo que o valor lá esteja
//   3. benefício        uma recomendação cobriu o mês
//   4. pago             está paga
//   5. o resto          está por pagar
//
// Trocar 2 com 3, ou 3 com 4, faz aparecer "por pagar" a quem não deve
// nada.

export type EstadoMensalidade =
  | 'por_gerar'
  | 'desistencia'
  | 'nao_devida'
  | 'paga'
  | 'por_pagar'

export type MensalidadeParaEstado = {
  desistencia: boolean
  beneficio_id: number | null
  pago: boolean
}

export function estadoMensalidade(
  mensalidade: MensalidadeParaEstado | null | undefined
): EstadoMensalidade {
  if (!mensalidade) return 'por_gerar'
  if (mensalidade.desistencia) return 'desistencia'
  if (mensalidade.beneficio_id !== null) return 'nao_devida'
  if (mensalidade.pago) return 'paga'
  return 'por_pagar'
}

// O que se mostra a quem lê. As palavras são as mesmas da web, para a
// mesma situação não ter dois nomes conforme o ecrã.
export const ROTULO_MENSALIDADE: Record<EstadoMensalidade, string> = {
  por_gerar: 'Ainda não gerada',
  desistencia: 'Desistência',
  nao_devida: 'Não devida · Recomendação',
  paga: 'Paga',
  por_pagar: 'Por pagar',
}

// Só o que está por pagar conta para o que há a receber. Uma mensalidade
// não gerada ainda não é uma dívida, e uma coberta por recomendação nunca
// chega a sê-lo.
export function totalPorReceber(
  linhas: { estado: EstadoMensalidade; valor: number | null }[]
): number {
  return linhas
    .filter((l) => l.estado === 'por_pagar')
    .reduce((total, l) => total + (l.valor ?? 0), 0)
}

// O que fica para o professor.
//
// A família paga um total; ao professor interessa o que lhe entra, e
// mostrar-lhe o valor cheio é prometer-lhe todos os meses mais do que vai
// receber. Sai-lhe do total tudo o que não é dele:
//
//   * a retenção do CCG (os 10 € de cada mensalidade);
//   * a inscrição e o seguro, que são da escola e passam uma vez por ano;
//   * o acréscimo de 20% por atraso, que é uma penalização da escola e
//     não uma aula a mais.
//
// Tudo isto vem guardado em cada mensalidade, e não da tabela de taxas: o
// que valeu naquele mês não pode mudar quando os preços mudarem. E é por
// subtração, e não por soma de uma parte guardada, para a conta continuar
// certa quando a secretaria corrige o total à mão — um aluno que entrou a
// meio do mês paga metade, e o professor recebe metade.
//
// Nunca devolve negativo. Uma retenção maior do que a mensalidade é um
// engano de configuração, e a resposta certa a um engano é zero — não um
// professor a dever dinheiro à escola.
export type PartesDaMensalidade = {
  valor: number | null | undefined
  retencao_ccg?: number | null
  inscricao?: number | null
  seguro?: number | null
  acrescimo?: number | null
}

export function parteDoProfessor(mensalidade: PartesDaMensalidade | null | undefined): number {
  const valor = mensalidade?.valor
  if (valor == null) return 0

  const daEscola =
    (mensalidade?.retencao_ccg ?? 0) +
    (mensalidade?.inscricao ?? 0) +
    (mensalidade?.seguro ?? 0) +
    (mensalidade?.acrescimo ?? 0)

  return Math.max(valor - daEscola, 0)
}
