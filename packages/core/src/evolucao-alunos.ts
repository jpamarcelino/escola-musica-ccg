// Quantos alunos teve um professor em cada mês do ano letivo — a série que
// o gráfico da ficha do professor desenha.
//
// Fica aqui, e não na página, porque é a única parte disto que se pode
// testar a sério: a contagem por mês, com matrículas que começam a meio
// do ano e outras que são canceladas. O SVG é só a leitura dela.

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

// Outubro de 2026 a junho de 2027: os meses em que há aulas. Não é o
// mesmo intervalo do MESES_ANO_LETIVO (setembro a agosto), que existe
// para o histórico de pagamentos e tem de cobrir os meses de acerto.
export const MESES_DE_AULAS: { ano: number; mes: number; label: string }[] = [
  ...[10, 11, 12].map((mes) => ({ ano: 2026, mes, label: NOMES_MES[mes - 1] })),
  ...[1, 2, 3, 4, 5, 6].map((mes) => ({ ano: 2027, mes, label: NOMES_MES[mes - 1] })),
]

export type MatriculaParaEvolucao = {
  aluno_id: string
  estado: string
  criado_em: string
  cancelada_em: string | null
}

export type PontoEvolucao = {
  ano: number
  mes: number
  label: string
  alunos: number
  // Um mês que ainda não chegou continua a ter uma contagem — as
  // matrículas confirmadas hoje valem para ele —, mas é uma previsão que
  // supõe que ninguém entra nem sai. O gráfico desenha-a a tracejado, e
  // não a confunde com o que já aconteceu.
  previsto: boolean
}

function primeiroDia(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-01`
}

function depoisDoUltimoDia(ano: number, mes: number): string {
  return mes === 12 ? primeiroDia(ano + 1, 1) : primeiroDia(ano, mes + 1)
}

// Um pedido por responder ('a_escolher') nunca foi um aluno deste
// professor — pode ainda ser recusado. Só conta quem chegou a ter aulas,
// mesmo que entretanto tenha cancelado.
function contarNoMes(
  matriculas: MatriculaParaEvolucao[],
  ano: number,
  mes: number,
): number {
  const inicio = primeiroDia(ano, mes)
  const fim = depoisDoUltimoDia(ano, mes)
  const alunos = new Set<string>()

  for (const m of matriculas) {
    if (m.estado === 'a_escolher') continue
    if (m.criado_em >= fim) continue
    // Quem cancelou a meio do mês ainda foi aluno nesse mês.
    if (m.cancelada_em != null && m.cancelada_em < inicio) continue
    alunos.add(m.aluno_id)
  }

  return alunos.size
}

// `hoje` em ISO (YYYY-MM-DD). O mês corrente já conta como passado: está a
// decorrer e os alunos que tem são os que tem.
export function evolucaoDeAlunos(
  matriculas: MatriculaParaEvolucao[],
  hoje: string,
): PontoEvolucao[] {
  return MESES_DE_AULAS.map(({ ano, mes, label }) => ({
    ano,
    mes,
    label,
    alunos: contarNoMes(matriculas, ano, mes),
    previsto: primeiroDia(ano, mes) > hoje,
  }))
}
