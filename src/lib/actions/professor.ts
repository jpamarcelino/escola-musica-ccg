'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DIAS_SEMANA } from '@/lib/dias-semana'

// Fora deste intervalo o Centro Cultural não abre — evita horários
// disparatados (ex: 1h da manhã) por engano de fuso ou digitação.
const HORARIO_MIN = '10:00'
const HORARIO_MAX = '22:00'

export async function confirmarHorario(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = String(formData.get('matriculaId') ?? '')
  const horarioId = String(formData.get('horarioId') ?? '')

  function voltarComErro(mensagem: string): never {
    redirect(`/dashboard/pedidos?erro=${encodeURIComponent(mensagem)}`)
  }

  const { data: matriculaAtual } = await supabase
    .from('matriculas')
    .select('aluno_id')
    .eq('id', matriculaId)
    .eq('professor_id', user.id)
    .maybeSingle()

  if (!matriculaAtual) {
    voltarComErro('Pedido não encontrado.')
  }

  const { data: horario } = await supabase
    .from('horarios')
    .select('dia_semana, hora_inicio, hora_fim')
    .eq('id', horarioId)
    .maybeSingle()

  if (!horario) {
    voltarComErro('Horário não encontrado.')
  }

  // O mesmo aluno não pode ficar com duas aulas confirmadas que se
  // sobrepõem no tempo, mesmo que sejam com professores/disciplinas
  // diferentes — cada aluno só está fisicamente num sítio de cada vez.
  const { data: outrasConfirmadas } = await supabase
    .from('matriculas')
    .select('horarios(dia_semana, hora_inicio, hora_fim)')
    .eq('aluno_id', matriculaAtual.aluno_id)
    .eq('estado', 'confirmado')
    .not('horario_final_id', 'is', null)
    .neq('id', matriculaId)

  const temSobreposicao = (
    (outrasConfirmadas ?? []) as unknown as {
      horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
    }[]
  ).some((c) => {
    const h = c.horarios
    return (
      h &&
      h.dia_semana === horario.dia_semana &&
      h.hora_inicio < horario.hora_fim &&
      h.hora_fim > horario.hora_inicio
    )
  })

  if (temSobreposicao) {
    voltarComErro(
      'Este aluno já tem outra aula confirmada que se sobrepõe a este horário. Escolhe outro horário.'
    )
  }

  const { data: matricula, error: erroConfirmar } = await supabase
    .from('matriculas')
    .update({ horario_final_id: Number(horarioId), estado: 'confirmado' })
    .eq('id', matriculaId)
    .eq('professor_id', user.id)
    .select(
      'aluno_id, alunos(nome, encarregado_id), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim)'
    )
    .single()

  if (erroConfirmar) {
    voltarComErro('Não foi possível confirmar este horário. Tenta novamente.')
  }

  if (matricula) {
    const m = matricula as unknown as {
      aluno_id: string
      alunos: { nome: string; encarregado_id: string } | null
      instrumentos: { nome: string } | null
      horarios: { dia_semana: string; hora_inicio: string; hora_fim: string } | null
    }
    // A notificação vai para quem gere o aluno (o encarregado) — um
    // dependente não tem inbox própria, e mesmo quando o próprio aluno
    // gere a conta, encarregado_id é ele mesmo.
    if (m.horarios && m.alunos) {
      await supabase.from('notificacoes').insert({
        user_id: m.alunos.encarregado_id,
        tipo: 'pedido_aceite',
        mensagem: `A aula de ${m.alunos.nome} (${m.instrumentos?.nome ?? ''}) foi confirmada: ${m.horarios.dia_semana}, ${m.horarios.hora_inicio.slice(0, 5)}–${m.horarios.hora_fim.slice(0, 5)}.`,
      })
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/pedidos')
  revalidatePath('/dashboard/horarios')
  revalidatePath('/aluno/notificacoes')
}

export async function cancelarMatricula(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = String(formData.get('matriculaId') ?? '')

  await supabase
    .from('matriculas')
    .delete()
    .eq('id', matriculaId)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/horarios')
}

export async function recusarPedido(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = String(formData.get('matriculaId') ?? '')

  await supabase
    .from('matriculas')
    .delete()
    .eq('id', matriculaId)
    .eq('professor_id', user.id)
    .eq('estado', 'a_escolher')

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/pedidos')
}

export async function alternarEstadoHorario(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const horarioId = String(formData.get('horarioId') ?? '')
  const novoEstado = String(formData.get('novoEstado') ?? '')

  await supabase
    .from('horarios')
    .update({ estado: novoEstado })
    .eq('id', horarioId)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard')
}

export async function atualizarInstrumentos(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const instrumentoIds = formData.getAll('instrumentos').map(String)

  const { data: perfil } = await supabase
    .from('perfis_escola')
    .select('programa')
    .eq('id', user.id)
    .single()

  await supabase.from('professor_instrumentos').delete().eq('professor_id', user.id)

  if (instrumentoIds.length > 0 && perfil?.programa) {
    // Confirma que os ids pertencem mesmo à escola (programa) do professor,
    // para não aceitar disciplinas da outra escola por manipulação do formulário.
    const { data: instrumentosValidos } = await supabase
      .from('instrumentos')
      .select('id')
      .eq('programa', perfil.programa)
      .in('id', instrumentoIds.map(Number))

    const idsValidos = (instrumentosValidos ?? []).map((i) => i.id)

    if (idsValidos.length > 0) {
      await supabase.from('professor_instrumentos').insert(
        idsValidos.map((id) => ({
          professor_id: user.id,
          instrumento_id: id,
          especialidade: String(formData.get(`especialidade_${id}`) ?? '').trim() || null,
        }))
      )
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/conta')
}

export async function atualizarFoto(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  function voltarComErro(mensagem: string): never {
    redirect(`/dashboard/conta?erroHorarios=${encodeURIComponent(mensagem)}`)
  }

  const ficheiro = formData.get('foto')
  if (!(ficheiro instanceof File) || ficheiro.size === 0) {
    voltarComErro('Escolhe uma foto para carregar.')
  }
  // Margem abaixo do limite de tamanho das Server Actions (10mb, em
  // next.config.ts) — para dar um erro claro em vez de a próprria
  // plataforma rejeitar o pedido a meio.
  if (ficheiro.size > 9 * 1024 * 1024) {
    voltarComErro('Essa foto é demasiado grande (máximo 9MB). Tenta outra ou reduz o tamanho.')
  }

  const caminho = `${user.id}/foto`
  const { error: erroUpload } = await supabase.storage
    .from('fotos-professores')
    .upload(caminho, ficheiro, { upsert: true, contentType: ficheiro.type })

  if (erroUpload) {
    voltarComErro('Não foi possível carregar a foto. Tenta novamente.')
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('fotos-professores').getPublicUrl(caminho)

  // Query string para a foto atualizar de imediato (o caminho no storage é sempre o mesmo).
  const fotoUrl = `${publicUrl}?v=${Date.now()}`

  await supabase.from('profiles').update({ foto_url: fotoUrl }).eq('id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/conta')
}

function gerarBlocos(horaInicio: string, horaFim: string, duracaoMinutos: number) {
  const paraMinutos = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  const paraHHMM = (minutos: number) => {
    const h = Math.floor(minutos / 60).toString().padStart(2, '0')
    const m = (minutos % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  }

  const inicio = paraMinutos(horaInicio)
  const fim = paraMinutos(horaFim)
  const blocos: { inicio: string; fim: string }[] = []

  for (let t = inicio; t + duracaoMinutos <= fim; t += duracaoMinutos) {
    blocos.push({ inicio: paraHHMM(t), fim: paraHHMM(t + duracaoMinutos) })
  }

  return blocos
}

export async function criarHorarios(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const duracaoMinutos = Number(formData.get('duracaoMinutos') ?? 0)

  function voltarComErro(mensagem: string): never {
    redirect(`/dashboard/horarios?erroHorarios=${encodeURIComponent(mensagem)}`)
  }

  if (!duracaoMinutos) {
    voltarComErro('Indica a duração de cada aula.')
  }

  const linhas: {
    professor_id: string
    dia_semana: string
    hora_inicio: string
    hora_fim: string
    estado: string
  }[] = []

  DIAS_SEMANA.forEach((dia, i) => {
    const horaInicio = String(formData.get(`inicio_${i}`) ?? '')
    const horaFim = String(formData.get(`fim_${i}`) ?? '')
    if (!horaInicio || !horaFim) return

    if (horaInicio < HORARIO_MIN || horaFim > HORARIO_MAX) {
      voltarComErro(
        `Os horários têm de estar entre as ${HORARIO_MIN} e as ${HORARIO_MAX} (${dia}).`
      )
    }

    for (const b of gerarBlocos(horaInicio, horaFim, duracaoMinutos)) {
      linhas.push({
        professor_id: user.id,
        dia_semana: dia,
        hora_inicio: b.inicio,
        hora_fim: b.fim,
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
      voltarComErro(
        'Já tens um horário igual criado (mesmo dia e hora). Verifica os horários que já existem.'
      )
    }
    voltarComErro('Não foi possível criar os horários. Tenta novamente.')
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/horarios')
}

export async function atualizarHorario(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const horarioId = String(formData.get('horarioId') ?? '')
  const diaSemana = String(formData.get('diaSemana') ?? '')
  const horaInicio = String(formData.get('horaInicio') ?? '')
  const horaFim = String(formData.get('horaFim') ?? '')

  function voltarComErro(mensagem: string): never {
    redirect(
      `/professor/horarios/${horarioId}?erro=${encodeURIComponent(mensagem)}`
    )
  }

  if (!diaSemana || !horaInicio || !horaFim) {
    voltarComErro('Preenche todos os campos.')
  }
  if (horaFim <= horaInicio) {
    voltarComErro('A hora de fim tem de ser depois da hora de início.')
  }
  if (horaInicio < HORARIO_MIN || horaFim > HORARIO_MAX) {
    voltarComErro(`Os horários têm de estar entre as ${HORARIO_MIN} e as ${HORARIO_MAX}.`)
  }

  const { error } = await supabase
    .from('horarios')
    .update({
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
    })
    .eq('id', horarioId)
    .eq('professor_id', user.id)

  if (error) {
    if (error.code === '23505') {
      voltarComErro('Já tens outro horário igual (mesmo dia e hora).')
    }
    voltarComErro('Não foi possível guardar as alterações. Tenta novamente.')
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function apagarHorario(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const horarioId = String(formData.get('horarioId') ?? '')

  const { error } = await supabase
    .from('horarios')
    .delete()
    .eq('id', horarioId)
    .eq('professor_id', user.id)

  if (error) {
    const mensagem = error.code === '23503'
      ? 'Não é possível apagar: já tens alunos confirmados neste horário. Bloqueia-o em vez disso.'
      : 'Não foi possível apagar o horário. Tenta novamente.'
    redirect(
      `/professor/horarios/${horarioId}?erro=${encodeURIComponent(mensagem)}`
    )
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function bloquearHorarios(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const ids = formData.getAll('horarioIds').map(String)

  if (ids.length === 0) {
    redirect('/dashboard/horarios?erroHorarios=' + encodeURIComponent('Seleciona pelo menos um horário.'))
  }

  await supabase
    .from('horarios')
    .update({ estado: 'bloqueado' })
    .in('id', ids)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/horarios')
  redirect('/dashboard/horarios')
}

export async function desbloquearHorarios(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const ids = formData.getAll('horarioIds').map(String)

  if (ids.length === 0) {
    redirect('/dashboard/horarios?erroHorarios=' + encodeURIComponent('Seleciona pelo menos um horário.'))
  }

  await supabase
    .from('horarios')
    .update({ estado: 'aberto' })
    .in('id', ids)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/horarios')
  redirect('/dashboard/horarios')
}

export async function apagarHorarios(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const ids = formData.getAll('horarioIds').map(String)

  if (ids.length === 0) {
    redirect('/dashboard/horarios?erroHorarios=' + encodeURIComponent('Seleciona pelo menos um horário.'))
  }

  let apagados = 0
  let bloqueados = 0

  for (const id of ids) {
    const { error } = await supabase
      .from('horarios')
      .delete()
      .eq('id', id)
      .eq('professor_id', user.id)

    if (error) {
      bloqueados += 1
    } else {
      apagados += 1
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/horarios')

  if (bloqueados > 0) {
    redirect(
      `/dashboard/horarios?erroHorarios=${encodeURIComponent(
        `${apagados} horário(s) apagado(s). ${bloqueados} não puderam ser apagados por teres alunos confirmados — bloqueia-os em vez disso.`
      )}`
    )
  }

  redirect('/dashboard/horarios')
}

export async function desmatricularAluno(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const matriculaId = String(formData.get('matriculaId') ?? '')
  const horarioId = String(formData.get('horarioId') ?? '')

  await supabase
    .from('matriculas')
    .delete()
    .eq('id', matriculaId)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard/agenda')
  revalidatePath(`/dashboard/agenda/${horarioId}`)
  redirect(`/dashboard/agenda/${horarioId}`)
}
