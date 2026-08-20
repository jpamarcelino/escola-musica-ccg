'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DIAS_SEMANA, duracaoDaAula, type DiaSemana } from '@ccg/core'

// Dar acesso de administração a uma pessoa, e tirá-lo.
//
// Substituem uma acção que reescrevia a coluna `admin` de todos os
// professores de uma vez, a partir de uma lista de caixas: para promover
// uma pessoa gravavam-se dezoito linhas, e bastava uma caixa desmarcada
// por engano para despromover quem lá estava.
//
// As duas passam pela mesma função na base de dados, que é quem verifica
// se quem chama é super administrador. Aqui em cima não há verificação
// nenhuma de propósito: uma regra desta importância escrita em dois
// sítios é uma regra que um dia diverge.
async function definirAdministrador(userId: string, admin: boolean, destino: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase.rpc('definir_administrador', {
    p_user_id: userId,
    p_admin: admin,
  })

  if (error) {
    redirect(`${destino}?erro=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/administradores')
  redirect(destino)
}

export async function tornarAdministrador(formData: FormData) {
  const userId = String(formData.get('userId') ?? '')
  await definirAdministrador(userId, true, '/admin/administradores')
}

export async function removerAdministrador(formData: FormData) {
  const userId = String(formData.get('userId') ?? '')
  await definirAdministrador(userId, false, '/admin/administradores')
}

// Criar horários para um professor, a partir do painel da secretaria.
//
// Existe por causa da Música para Bebés: são aulas de grupo, e a grelha é
// montada para a escola inteira, não professor a professor. Mas serve
// qualquer escola — a secretaria pode ter de abrir uma hora a um
// professor que não está à frente do computador.
//
// A duração continua a ser a da escola: quem cria não muda a regra.
export async function criarHorariosDeProfessor(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const professorId = String(formData.get('professorId') ?? '')
  const destino = `/admin/professores/${professorId}/horario`

  function voltarComErro(mensagem: string): never {
    redirect(`${destino}?erro=${encodeURIComponent(mensagem)}`)
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: perfilProfessor } = await supabase
    .from('perfis_escola')
    .select('tipo, programa')
    .eq('id', professorId)
    .single()

  if (perfilProfessor?.tipo !== 'professor') {
    voltarComErro('Essa conta não é de professor.')
  }

  const duracao = duracaoDaAula(perfilProfessor.programa)
  if (!duracao) {
    voltarComErro('Este professor ainda não tem escola atribuída.')
  }

  const linhas: {
    professor_id: string
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    estado: string
  }[] = []

  DIAS_SEMANA.forEach((dia, i) => {
    const horaInicio = String(formData.get(`inicio_${i}`) ?? '')
    const horaFim = String(formData.get(`fim_${i}`) ?? '')
    if (!horaInicio || !horaFim) return

    if (horaInicio < '10:00' || horaFim > '22:00') {
      voltarComErro(`Os horários têm de estar entre as 10:00 e as 22:00 (${dia}).`)
    }

    for (const bloco of blocosDe(horaInicio, horaFim, duracao)) {
      linhas.push({
        professor_id: professorId,
        dia_semana: dia,
        hora_inicio: bloco.inicio,
        hora_fim: bloco.fim,
        estado: 'aberto',
      })
    }
  })

  if (linhas.length === 0) {
    voltarComErro('Preenche pelo menos um dia com horário.')
  }

  const { error } = await supabase.from('horarios').insert(linhas)

  if (error) {
    if (error.code === '23505') {
      voltarComErro('Já existe um horário igual (mesmo dia e hora) para este professor.')
    }
    voltarComErro('Não foi possível criar os horários. Tenta novamente.')
  }

  revalidatePath(destino)
  redirect(`${destino}?criados=${linhas.length}`)
}

// Parte uma janela de disponibilidade em blocos de aula. É a mesma conta
// que a acção do professor faz — e é por isso que vive aqui em cima, num
// sítio só, e não copiada nos dois ficheiros.
function blocosDe(horaInicio: string, horaFim: string, duracao: number) {
  const minutos = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const hhmm = (total: number) =>
    `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

  const blocos: { inicio: string; fim: string }[] = []
  for (let t = minutos(horaInicio); t + duracao <= minutos(horaFim); t += duracao) {
    blocos.push({ inicio: hhmm(t), fim: hhmm(t + duracao) })
  }
  return blocos
}

// A secretaria responde a um pedido de disciplina. Aceitar é o único
// caminho que acrescenta a disciplina ao professor — a tabela deixou de
// aceitar escrita dele (migração 0040).
async function responderDisciplina(formData: FormData, aceitar: boolean): Promise<never> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const pedidoId = Number(formData.get('pedidoId') ?? 0)
  const resposta = String(formData.get('resposta') ?? '').trim()
  const destino = '/admin/professores/disciplinas'

  const { error } = await supabase.rpc('responder_pedido_instrumento', {
    p_pedido_id: pedidoId,
    p_aceitar: aceitar,
    p_resposta: resposta || null,
  })

  if (error) {
    redirect(`${destino}?erro=${encodeURIComponent(error.message)}`)
  }

  revalidatePath(destino)
  revalidatePath('/admin/professores')
  redirect(destino)
}

export async function aceitarDisciplina(formData: FormData) {
  await responderDisciplina(formData, true)
}

export async function recusarDisciplina(formData: FormData) {
  await responderDisciplina(formData, false)
}
