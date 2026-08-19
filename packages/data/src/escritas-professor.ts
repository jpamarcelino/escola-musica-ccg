import { validarDataDePresenca, type DiaSemana } from '@ccg/core'
import type { PresencaEstado } from '@ccg/types'
import type { ClienteCcg } from './cliente'

// As escritas do professor.
//
// Não recebem o id de quem escreve, e isso é de propósito: quem decide se
// a escrita passa são as políticas de RLS, a partir da sessão do cliente.
// Passar um `professorId` daria a ilusão de se poder escrever em nome de
// outra pessoa — o Postgres recusaria, mas o código estaria a mentir
// sobre o que consegue fazer.
//
// Todas devolvem `{ erro }` ou `{ erro: null }`. Não lançam excepções:
// quem chama tem sempre de mostrar alguma coisa a quem carregou no botão,
// e um `try/catch` à volta de cada chamada convida a esquecer isso.

export type Resultado = { erro: string | null }

const FALHA_GENERICA = 'Não foi possível guardar. Tenta novamente.'

export type MarcacaoPresenca = {
  matriculaId: number
  alunoId: string
  instrumentoNome: string | null
  estado: PresencaEstado
}

// Marca as presenças de uma aula. O `upsert` sobre (matricula_id, data)
// faz com que marcar duas vezes corrija em vez de duplicar — é isso que
// permite ao professor voltar atrás e mudar uma falta.
export async function marcarPresencas(
  supabase: ClienteCcg,
  args: {
    data: string
    diaDoHorario: DiaSemana
    professorId: string
    marcacoes: MarcacaoPresenca[]
  }
): Promise<Resultado> {
  const problema = validarDataDePresenca(args.data, args.diaDoHorario)
  if (problema) return { erro: problema }

  if (args.marcacoes.length === 0) {
    return { erro: 'Marca pelo menos um aluno.' }
  }

  const agora = new Date().toISOString()
  const { error } = await supabase.from('presencas').upsert(
    args.marcacoes.map((m) => ({
      matricula_id: m.matriculaId,
      aluno_id: m.alunoId,
      professor_id: args.professorId,
      instrumento_nome: m.instrumentoNome,
      data: args.data,
      estado: m.estado,
      marcado_por: args.professorId,
      atualizado_em: agora,
    })),
    { onConflict: 'matricula_id,data' }
  )

  return { erro: error ? 'Não foi possível guardar as presenças. Tenta novamente.' : null }
}

// Confirma um pedido, atribuindo-lhe um horário. O estado passa a
// 'confirmado' e o horario_final_id fica preenchido — é essa combinação
// que faz a aula existir para toda a app.
export async function confirmarPedido(
  supabase: ClienteCcg,
  matriculaId: number,
  horarioId: number
): Promise<Resultado> {
  const { error } = await supabase
    .from('matriculas')
    .update({ estado: 'confirmado', horario_final_id: horarioId })
    .eq('id', matriculaId)

  if (error) {
    // A base de dados impede que o mesmo aluno fique com duas aulas
    // sobrepostas (migração 0012). Quando é isso que falha, dizer "tenta
    // outra vez" seria mandar a pessoa repetir o que não pode dar certo.
    const sobreposicao = /sobrep|overlap|exclusion/i.test(error.message)
    return {
      erro: sobreposicao
        ? 'Este aluno já tem outra aula a essa hora.'
        : FALHA_GENERICA,
    }
  }

  return { erro: null }
}

// Recusar apaga o pedido. É o que a web faz: um pedido recusado não fica
// como registo, desaparece — quem o fez pode voltar a pedir.
export async function recusarPedido(
  supabase: ClienteCcg,
  matriculaId: number
): Promise<Resultado> {
  // O estado no filtro, e não só na política de RLS: desde a migração
  // 0029 que apagar uma matrícula CONFIRMADA deixou de ser possível (essa
  // passa a "cancelado", pela função). Sem isto, o código continuava a
  // pedir um apagar que a base de dados recusa em silêncio.
  const { error } = await supabase
    .from('matriculas')
    .delete()
    .eq('id', matriculaId)
    .eq('estado', 'a_escolher')
  return { erro: error ? FALHA_GENERICA : null }
}

export async function alternarEstadoHorario(
  supabase: ClienteCcg,
  horarioId: number,
  bloquear: boolean
): Promise<Resultado> {
  const { error } = await supabase
    .from('horarios')
    .update({ estado: bloquear ? 'bloqueado' : 'aberto' })
    .eq('id', horarioId)

  return { erro: error ? FALHA_GENERICA : null }
}
