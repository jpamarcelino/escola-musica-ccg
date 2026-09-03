'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MESES_ANO_LETIVO } from '@ccg/core'
import { ehSecretaria } from '@/lib/permissoes'

type SupabaseServidor = Awaited<ReturnType<typeof createClient>>

// "aluno_nome" existe desde a 0014 para o histórico de mensalidades
// sobreviver ao aluno apagar a conta — a grelha do histórico usa-o como
// recurso quando já não há matrícula nem perfil de onde tirar o nome.
// Nenhuma das ações desta página o preenchia, o que fazia um aluno
// desaparecer dessa grelha assim que saía. Lê-se do servidor, e não do
// formulário, para o nome guardado ser sempre o real.
async function nomesDosAlunos(supabase: SupabaseServidor, alunoIds: string[]) {
  const unicos = [...new Set(alunoIds.filter(Boolean))]
  if (unicos.length === 0) return new Map<string, string>()

  const { data } = await supabase.from('alunos').select('id, nome').in('id', unicos)
  return new Map(((data ?? []) as { id: string; nome: string }[]).map((a) => [a.id, a.nome]))
}

// Todas as ações desta página escrevem dinheiro, e todas exigem o mesmo:
// ser da secretaria. A direção lê as mesmas páginas e não tem nenhum
// destes botões — a porta que conta é a policy, isto só evita a viagem.
async function exigirSecretaria() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin, secretaria, super_admin')
    .eq('id', user.id)
    .single()

  if (!ehSecretaria(perfilAtual)) {
    redirect('/dashboard')
  }

  return { supabase, user }
}

export async function definirValorMensal(formData: FormData) {
  const { supabase, user } = await exigirSecretaria()

  const matriculaId = String(formData.get('matriculaId') ?? '')
  const valorTexto = String(formData.get('valor') ?? '').replace(',', '.')
  const valor = valorTexto === '' ? null : Number(valorTexto)

  if (valor !== null && (Number.isNaN(valor) || valor < 0)) {
    redirect('/admin/pagamentos?erro=' + encodeURIComponent('Valor inválido.'))
  }

  await supabase
    .from('matriculas')
    .update({ valor_mensal: valor })
    .eq('id', matriculaId)

  revalidatePath('/admin/pagamentos')
}

// A isenção dos 10 € que vão para o CCG.
//
// À mão, matrícula a matrícula, e não por uma regra automática: quem é
// voluntário do rancho é coisa que a app não sabe nem tem como saber, e
// uma regra que adivinhasse errado tirava ou punha dinheiro à pessoa
// errada. A partir daqui, a geração do dia 1 respeita-a sozinha (0044).
//
// Não mexe em meses já gerados de propósito: cada mensalidade guarda a
// retenção que valeu nesse mês, e reescrever o passado mudava contas de
// professores que já foram fechadas.
export async function definirIsencaoCcg(formData: FormData) {
  const { supabase } = await exigirSecretaria()

  const matriculaId = String(formData.get('matriculaId') ?? '')
  const isento = String(formData.get('isento') ?? '') === 'true'

  await supabase.from('matriculas').update({ isento_ccg: isento }).eq('id', matriculaId)

  revalidatePath('/admin/pagamentos/confirmar')
}

export async function marcarMensalidadePaga(formData: FormData) {
  const { supabase, user } = await exigirSecretaria()

  const matriculaId = Number(formData.get('matriculaId') ?? 0)
  const alunoId = String(formData.get('alunoId') ?? '')
  const professorId = String(formData.get('professorId') ?? '')
  const instrumentoNome = String(formData.get('instrumentoNome') ?? '') || null
  // A disciplina passa a fazer parte da identidade de uma mensalidade
  // (0045). Sem ela, gravar a segunda disciplina de um aluno com o mesmo
  // professor escrevia por cima da primeira.
  const instrumentoId = Number(formData.get('instrumentoId') ?? 0)
  const ano = Number(formData.get('ano') ?? 0)
  const mes = Number(formData.get('mes') ?? 0)
  const valor = Number(formData.get('valor') ?? 0)
  const pago = String(formData.get('pago') ?? '') === 'true'
  const numeroFatura = String(formData.get('numeroFatura') ?? '').trim() || null

  const nomes = await nomesDosAlunos(supabase, [alunoId])

  await supabase.from('mensalidades').upsert(
    {
      matricula_id: matriculaId,
      aluno_id: alunoId,
      aluno_nome: nomes.get(alunoId) ?? null,
      professor_id: professorId,
      instrumento_id: instrumentoId,
      instrumento_nome: instrumentoNome,
      ano,
      mes,
      valor,
      pago,
      pago_em: pago ? new Date().toISOString() : null,
      marcado_por: user.id,
      numero_fatura: numeroFatura,
    },
    { onConflict: 'aluno_id,professor_id,instrumento_id,ano,mes' }
  )

  revalidatePath('/admin/pagamentos')
}

export async function definirNumeroFatura(formData: FormData) {
  const { supabase, user } = await exigirSecretaria()

  const matriculaId = Number(formData.get('matriculaId') ?? 0)
  const alunoId = String(formData.get('alunoId') ?? '')
  const professorId = String(formData.get('professorId') ?? '')
  const instrumentoNome = String(formData.get('instrumentoNome') ?? '') || null
  // A disciplina passa a fazer parte da identidade de uma mensalidade
  // (0045). Sem ela, gravar a segunda disciplina de um aluno com o mesmo
  // professor escrevia por cima da primeira.
  const instrumentoId = Number(formData.get('instrumentoId') ?? 0)
  const ano = Number(formData.get('ano') ?? 0)
  const mes = Number(formData.get('mes') ?? 0)
  const valor = Number(formData.get('valor') ?? 0)
  const pago = String(formData.get('pago') ?? '') === 'true'
  const numeroFatura = String(formData.get('numeroFatura') ?? '').trim() || null

  const nomes = await nomesDosAlunos(supabase, [alunoId])

  await supabase.from('mensalidades').upsert(
    {
      matricula_id: matriculaId,
      aluno_id: alunoId,
      aluno_nome: nomes.get(alunoId) ?? null,
      professor_id: professorId,
      instrumento_id: instrumentoId,
      instrumento_nome: instrumentoNome,
      ano,
      mes,
      valor,
      pago,
      numero_fatura: numeroFatura,
    },
    { onConflict: 'aluno_id,professor_id,instrumento_id,ano,mes' }
  )

  revalidatePath('/admin/pagamentos')
}

// Edição em massa da tabela de histórico (um professor, todos os meses do
// ano letivo, todos os alunos que já lá apareceram). Célula em branco =
// apaga o registo desse mês (o que faz o aluno voltar a aparecer em
// "por confirmar" se for o mês atual); célula preenchida = grava.
export async function atualizarHistoricoMensalidades(formData: FormData) {
  const { supabase, user } = await exigirSecretaria()

  const professorId = String(formData.get('professorId') ?? '')

  // Cada linha da grelha é um par aluno+disciplina ("uuid:12"), e não um
  // aluno: desde a 0045 a disciplina faz parte da identidade de uma
  // mensalidade, e quem anda em duas disciplinas com o mesmo professor
  // tem duas linhas por mês.
  const linhas = formData
    .getAll('linhas')
    .map(String)
    .map((chave) => {
      const [alunoId, instrumento] = chave.split(':')
      return { chave, alunoId, instrumentoId: Number(instrumento ?? 0) }
    })
    .filter((l) => l.alunoId)

  const alunoIds = linhas.map((l) => l.alunoId)

  // Esta grelha inclui de propósito alunos que já se desmatricularam ou
  // apagaram a conta — para esses já não há linha em "alunos", por isso o
  // nome tem de vir do que já está gravado nas suas próprias mensalidades.
  // Sem este recurso, gravar aqui apagaria o nome guardado e o aluno
  // desapareceria da grelha na visita seguinte.
  const nomes = await nomesDosAlunos(supabase, alunoIds)
  const { data: nomesGravados } = await supabase
    .from('mensalidades')
    .select('aluno_id, aluno_nome')
    .eq('professor_id', professorId)
    .not('aluno_nome', 'is', null)
  for (const m of (nomesGravados ?? []) as { aluno_id: string; aluno_nome: string }[]) {
    if (!nomes.has(m.aluno_id)) nomes.set(m.aluno_id, m.aluno_nome)
  }

  // O nome da disciplina, para as linhas gravadas aqui ficarem com o
  // mesmo snapshot que a geração automática escreve.
  const idsDisciplina = [...new Set(linhas.map((l) => l.instrumentoId).filter((i) => i > 0))]
  const { data: disciplinasData } =
    idsDisciplina.length > 0
      ? await supabase.from('instrumentos').select('id, nome').in('id', idsDisciplina)
      : { data: [] }
  const nomeDaDisciplina = new Map(
    ((disciplinasData ?? []) as { id: number; nome: string }[]).map((i) => [i.id, i.nome])
  )

  const paraGuardar: {
    aluno_id: string
    aluno_nome: string | null
    professor_id: string
    instrumento_id: number
    instrumento_nome: string | null
    ano: number
    mes: number
    valor: number
    numero_fatura: string | null
    pago: boolean
    pago_em: string
    marcado_por: string
  }[] = []

  for (const { chave, alunoId, instrumentoId } of linhas) {
    for (const { ano, mes } of MESES_ANO_LETIVO) {
      const valorTexto = String(formData.get(`v_${chave}_${ano}_${mes}`) ?? '')
        .trim()
        .replace(',', '.')
      const faturaTexto = String(formData.get(`f_${chave}_${ano}_${mes}`) ?? '').trim()

      if (valorTexto === '') {
        await supabase
          .from('mensalidades')
          .delete()
          .eq('aluno_id', alunoId)
          .eq('professor_id', professorId)
          .eq('instrumento_id', instrumentoId)
          .eq('ano', ano)
          .eq('mes', mes)
        continue
      }

      const valor = Number(valorTexto)
      if (Number.isNaN(valor) || valor < 0) continue

      paraGuardar.push({
        aluno_id: alunoId,
        aluno_nome: nomes.get(alunoId) ?? null,
        instrumento_id: instrumentoId,
        instrumento_nome: nomeDaDisciplina.get(instrumentoId) ?? null,
        professor_id: professorId,
        ano,
        mes,
        valor,
        numero_fatura: faturaTexto || null,
        pago: true,
        pago_em: new Date().toISOString(),
        marcado_por: user.id,
      })
    }
  }

  if (paraGuardar.length > 0) {
    await supabase
      .from('mensalidades')
      .upsert(paraGuardar, { onConflict: 'aluno_id,professor_id,instrumento_id,ano,mes' })
  }

  revalidatePath(`/admin/pagamentos/historico/${professorId}`)
  revalidatePath('/admin/pagamentos/confirmar')
}
