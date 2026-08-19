import type { BeneficioEstado, RecomendacaoEstado } from '@ccg/types'
import type { ClienteCcg } from './cliente'

export type LinhaEstudo = {
  id: number
  recomendadorNome: string
  novoAlunoNome: string
  professorNome: string
  professorAderente: boolean
  modalidade: string | null
  dataInscricao: string | null
  dataPrimeiroPagamento: string | null
  dataValidacao: string | null
  valorInscricao: number | null
  valorSeguro: number | null
  estado: RecomendacaoEstado
  motivoAnulacao: string | null
  beneficioEstado: string | null
  beneficioMes: string | null
  beneficioValor: number | null
  // Permanência e receita do novo aluno — as alíneas d) e h) do Art. 30.º.
  mesesPagosNovoAluno: number
  receitaNovoAluno: number
  novoAlunoDesistiu: boolean
}

export type TotaisEstudo = {
  recomendacoes: number
  validadas: number
  anuladas: number
  beneficiosConcedidos: number
  beneficiosUsados: number
  beneficiosPendentes: number
  beneficiosExpirados: number
  valorBeneficios: number
  valorInscricoes: number
  valorSeguros: number
  receitaNovosAlunos: number
  desistencias: number
  professoresAbrangidos: number
}

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

// Reúne tudo o que o Art. 30.º do Regulamento e o §28 da proposta pedem
// para o relatório final. Fica aqui, e não dentro da página, porque a
// exportação CSV tem de devolver exatamente os mesmos números que o ecrã
// mostra — se as duas contas vivessem em sítios diferentes, acabariam
// por divergir.
export async function recolherDadosEstudo(supabase: ClienteCcg) {
  const { data: recomendacoesData } = await supabase
    .from('recomendacoes')
    .select(
      'id, recomendador_nome, novo_aluno_id, novo_aluno_nome, professor_id, professor_nome, modalidade, data_inscricao, data_primeiro_pagamento, valor_inscricao, valor_seguro, data_validacao, estado, motivo_anulacao'
    )
    .order('criado_em')

  const recomendacoes = (recomendacoesData ?? []) as {
    id: number
    recomendador_nome: string
    novo_aluno_id: string | null
    novo_aluno_nome: string
    professor_id: string
    professor_nome: string
    modalidade: string | null
    data_inscricao: string | null
    data_primeiro_pagamento: string | null
    valor_inscricao: number | null
    valor_seguro: number | null
    data_validacao: string | null
    estado: RecomendacaoEstado
    motivo_anulacao: string | null
  }[]

  const { data: beneficiosData } = await supabase
    .from('beneficios')
    .select('recomendacao_id, estado, ano_uso, mes_uso, valor_coberto')
  const beneficios = (beneficiosData ?? []) as {
    recomendacao_id: number
    estado: BeneficioEstado
    ano_uso: number | null
    mes_uso: number | null
    valor_coberto: number | null
  }[]
  const beneficioPorRecomendacao = new Map(beneficios.map((b) => [b.recomendacao_id, b]))

  const { data: aderentesData } = await supabase
    .from('perfis_escola')
    .select('id, adere_recomendacao')
    .eq('tipo', 'professor')
  const aderentes = new Map(
    ((aderentesData ?? []) as { id: string; adere_recomendacao: boolean }[]).map((p) => [
      p.id,
      p.adere_recomendacao,
    ])
  )

  // Permanência e receita dos novos alunos, numa consulta só. Uma
  // mensalidade marcada como desistência não é receita nem mês pago —
  // é o sinal de que o aluno saiu (0014).
  const novoAlunoIds = recomendacoes
    .map((r) => r.novo_aluno_id)
    .filter((id): id is string => id !== null)

  const { data: mensalidadesData } =
    novoAlunoIds.length > 0
      ? await supabase
          .from('mensalidades')
          .select('aluno_id, valor, pago, desistencia')
          .in('aluno_id', novoAlunoIds)
      : { data: [] }
  const mensalidades = (mensalidadesData ?? []) as {
    aluno_id: string
    valor: number | null
    pago: boolean
    desistencia: boolean
  }[]

  const porNovoAluno = new Map<string, { meses: number; receita: number; desistiu: boolean }>()
  for (const m of mensalidades) {
    const atual = porNovoAluno.get(m.aluno_id) ?? { meses: 0, receita: 0, desistiu: false }
    if (m.desistencia) {
      atual.desistiu = true
    } else if (m.pago) {
      atual.meses += 1
      atual.receita += m.valor ?? 0
    }
    porNovoAluno.set(m.aluno_id, atual)
  }

  const linhas: LinhaEstudo[] = recomendacoes.map((r) => {
    const beneficio = beneficioPorRecomendacao.get(r.id) ?? null
    const novoAluno = r.novo_aluno_id ? porNovoAluno.get(r.novo_aluno_id) : undefined

    return {
      id: r.id,
      recomendadorNome: r.recomendador_nome,
      novoAlunoNome: r.novo_aluno_nome,
      professorNome: r.professor_nome,
      professorAderente: aderentes.get(r.professor_id) ?? false,
      modalidade: r.modalidade,
      dataInscricao: r.data_inscricao,
      dataPrimeiroPagamento: r.data_primeiro_pagamento,
      dataValidacao: r.data_validacao,
      valorInscricao: r.valor_inscricao,
      valorSeguro: r.valor_seguro,
      estado: r.estado,
      motivoAnulacao: r.motivo_anulacao,
      beneficioEstado: beneficio?.estado ?? null,
      beneficioMes:
        beneficio?.ano_uso && beneficio.mes_uso
          ? `${NOMES_MES[beneficio.mes_uso - 1]} ${beneficio.ano_uso}`
          : null,
      beneficioValor: beneficio?.valor_coberto ?? null,
      mesesPagosNovoAluno: novoAluno?.meses ?? 0,
      receitaNovoAluno: novoAluno?.receita ?? 0,
      novoAlunoDesistiu: novoAluno?.desistiu ?? false,
    }
  })

  const totais: TotaisEstudo = {
    recomendacoes: linhas.length,
    validadas: linhas.filter((l) => l.estado === 'validada').length,
    anuladas: linhas.filter((l) => l.estado === 'anulada').length,
    beneficiosConcedidos: linhas.filter((l) => l.beneficioEstado !== null).length,
    beneficiosUsados: linhas.filter((l) => l.beneficioEstado === 'usado').length,
    beneficiosPendentes: linhas.filter((l) => l.beneficioEstado === 'pendente').length,
    beneficiosExpirados: linhas.filter((l) => l.beneficioEstado === 'expirado').length,
    valorBeneficios: linhas.reduce((soma, l) => soma + (l.beneficioValor ?? 0), 0),
    valorInscricoes: linhas.reduce((soma, l) => soma + (l.valorInscricao ?? 0), 0),
    // O seguro é cobrado uma vez, com a inscrição, e é dinheiro que só
    // entra porque a recomendação trouxe o aluno — por isso conta para o
    // balanço, mas em linha própria: são duas taxas distintas e podem
    // divergir uma da outra.
    valorSeguros: linhas.reduce((soma, l) => soma + (l.valorSeguro ?? 0), 0),
    receitaNovosAlunos: linhas.reduce((soma, l) => soma + l.receitaNovoAluno, 0),
    desistencias: linhas.filter((l) => l.novoAlunoDesistiu).length,
    professoresAbrangidos: new Set(linhas.map((l) => l.professorNome)).size,
  }

  return { linhas, totais }
}

const COLUNAS_CSV = [
  'id',
  'recomendador',
  'novo_aluno',
  'professor',
  'professor_aderente',
  'modalidade',
  'data_inscricao',
  'data_primeiro_pagamento',
  'valor_inscricao',
  'valor_seguro',
  'data_validacao',
  'estado',
  'motivo_anulacao',
  'beneficio_estado',
  'beneficio_mes_usado',
  'beneficio_valor',
  'meses_pagos_novo_aluno',
  'receita_novo_aluno',
  'novo_aluno_desistiu',
]

function celula(valor: string | number | boolean | null) {
  if (valor === null) return ''
  const texto = String(valor)
  // Aspas duplicadas e o campo entre aspas — os nomes podem conter
  // vírgulas e o motivo de anulação é texto livre.
  return `"${texto.replace(/"/g, '""')}"`
}

export function estudoParaCsv(linhas: LinhaEstudo[]) {
  const cabecalho = COLUNAS_CSV.join(',')
  const corpo = linhas.map((l) =>
    [
      l.id,
      l.recomendadorNome,
      l.novoAlunoNome,
      l.professorNome,
      l.professorAderente ? 'sim' : 'nao',
      l.modalidade,
      l.dataInscricao,
      l.dataPrimeiroPagamento,
      l.valorInscricao,
      l.valorSeguro,
      l.dataValidacao,
      l.estado,
      l.motivoAnulacao,
      l.beneficioEstado,
      l.beneficioMes,
      l.beneficioValor,
      l.mesesPagosNovoAluno,
      l.receitaNovoAluno,
      l.novoAlunoDesistiu ? 'sim' : 'nao',
    ]
      .map(celula)
      .join(',')
  )

  // BOM à cabeça para o Excel abrir os acentos corretamente.
  return '﻿' + [cabecalho, ...corpo].join('\n')
}

// ---------------------------------------------------------------------
// Desempenho por professor
//
// A pergunta do projeto-piloto não é só "quanto rendeu o Programa" — é
// "aderir compensa?". E essa só se responde pondo lado a lado quem aderiu
// e quem não aderiu, professor a professor.
//
// Vive ao lado do resto do estudo, e não numa página só sua, pela mesma
// razão que o CSV: são números da mesma pergunta, e separá-los em dois
// sítios com duas contas é como acabam por divergir.
// ---------------------------------------------------------------------

export type DesempenhoProfessor = {
  professorId: string
  nome: string
  programa: string | null
  aderente: boolean
  aderiuEm: string | null
  // Matrículas confirmadas neste momento.
  alunosAtivos: number
  // Matrículas criadas no último ano, aderente ou não — é a coluna que
  // permite comparar crescimento entre os dois grupos.
  alunosNovosUltimoAno: number
  // Só para aderentes: quantos entraram depois de ele ter aderido.
  alunosDesdeAdesao: number | null
  recomendacoesValidadas: number
  mesesGratisDados: number
  custoMesesGratis: number
  receitaPaga: number
  // O que sobra depois de descontar o que ele suportou do seu bolso.
  // Metade do mês grátis é do CCG (Art. 5.º), mas o que aqui interessa é
  // o efeito na conta do professor.
  saldo: number
}

export async function recolherDesempenhoPorProfessor(
  supabase: ClienteCcg
): Promise<DesempenhoProfessor[]> {
  const { data: professoresData } = await supabase
    .from('perfis_escola')
    .select('id, programa, adere_recomendacao, adesao_recomendacao_em, profiles(nome)')
    .eq('tipo', 'professor')

  const professores = (professoresData ?? []) as unknown as {
    id: string
    programa: string | null
    adere_recomendacao: boolean
    adesao_recomendacao_em: string | null
    profiles: { nome: string } | null
  }[]

  const [{ data: matriculasData }, { data: mensalidadesData }, { data: recomendacoesData }, { data: beneficiosData }] =
    await Promise.all([
      supabase.from('matriculas').select('professor_id, aluno_id, estado, criado_em'),
      // `desistencia` marca a mensalidade que assinala a saída do aluno
      // (0014) — não é receita, e contá-la inflacionava os dois grupos.
      supabase.from('mensalidades').select('professor_id, valor, pago, desistencia'),
      supabase.from('recomendacoes').select('professor_id, estado'),
      supabase.from('beneficios').select('professor_id, estado, valor_coberto'),
    ])

  const matriculas = (matriculasData ?? []) as {
    professor_id: string
    aluno_id: string
    estado: string
    criado_em: string
  }[]
  const mensalidades = (mensalidadesData ?? []) as {
    professor_id: string
    valor: number | null
    pago: boolean
    desistencia: boolean
  }[]
  const recomendacoes = (recomendacoesData ?? []) as {
    professor_id: string
    estado: RecomendacaoEstado
  }[]
  const beneficios = (beneficiosData ?? []) as {
    professor_id: string
    estado: BeneficioEstado
    valor_coberto: number | null
  }[]

  const haUmAno = new Date()
  haUmAno.setFullYear(haUmAno.getFullYear() - 1)

  return professores
    .map((p) => {
      const minhas = matriculas.filter((m) => m.professor_id === p.id)
      // Contam-se alunos, e não matrículas: quem tem piano e bateria com
      // o mesmo professor é um aluno, não dois.
      const alunosAtivos = new Set(
        minhas.filter((m) => m.estado === 'confirmado').map((m) => m.aluno_id)
      ).size
      // Só matrículas confirmadas contam como aluno novo. Contar também
      // os pedidos por responder dava colunas absurdas — mais "novos" do
      // que alunos ao todo — e sobretudo dizia o que ainda não aconteceu:
      // um pedido não é um aluno, é uma intenção.
      const confirmadas = minhas.filter((m) => m.estado === 'confirmado')
      const alunosNovosUltimoAno = new Set(
        confirmadas.filter((m) => new Date(m.criado_em) >= haUmAno).map((m) => m.aluno_id)
      ).size
      const alunosDesdeAdesao =
        p.adere_recomendacao && p.adesao_recomendacao_em
          ? new Set(
              confirmadas
                .filter((m) => new Date(m.criado_em) >= new Date(p.adesao_recomendacao_em!))
                .map((m) => m.aluno_id)
            ).size
          : null

      const receitaPaga = mensalidades
        .filter((m) => m.professor_id === p.id && m.pago && !m.desistencia)
        .reduce((soma, m) => soma + (m.valor ?? 0), 0)

      const meus = beneficios.filter((b) => b.professor_id === p.id)
      const usados = meus.filter((b) => b.estado === 'usado')
      const custoMesesGratis = usados.reduce((soma, b) => soma + (b.valor_coberto ?? 0), 0)

      return {
        professorId: p.id,
        nome: p.profiles?.nome ?? 'Sem nome',
        programa: p.programa,
        aderente: p.adere_recomendacao,
        aderiuEm: p.adesao_recomendacao_em,
        alunosAtivos,
        alunosNovosUltimoAno,
        alunosDesdeAdesao,
        recomendacoesValidadas: recomendacoes.filter(
          (r) => r.professor_id === p.id && r.estado === 'validada'
        ).length,
        mesesGratisDados: usados.length,
        custoMesesGratis,
        receitaPaga,
        saldo: receitaPaga - custoMesesGratis,
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
}
