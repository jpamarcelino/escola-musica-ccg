'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DIAS_SEMANA } from '@/lib/dias-semana'

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

  await supabase
    .from('matriculas')
    .update({ horario_final_id: Number(horarioId), estado: 'confirmado' })
    .eq('id', matriculaId)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard')
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
    .from('profiles')
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
    redirect(`/dashboard?erroHorarios=${encodeURIComponent(mensagem)}`)
  }

  const ficheiro = formData.get('foto')
  if (!(ficheiro instanceof File) || ficheiro.size === 0) {
    voltarComErro('Escolhe uma foto para carregar.')
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
    redirect(`/dashboard?erroHorarios=${encodeURIComponent(mensagem)}`)
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
    redirect('/dashboard?erroHorarios=' + encodeURIComponent('Seleciona pelo menos um horário.'))
  }

  await supabase
    .from('horarios')
    .update({ estado: 'bloqueado' })
    .in('id', ids)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard')
  redirect('/dashboard')
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
    redirect('/dashboard?erroHorarios=' + encodeURIComponent('Seleciona pelo menos um horário.'))
  }

  await supabase
    .from('horarios')
    .update({ estado: 'aberto' })
    .in('id', ids)
    .eq('professor_id', user.id)

  revalidatePath('/dashboard')
  redirect('/dashboard')
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
    redirect('/dashboard?erroHorarios=' + encodeURIComponent('Seleciona pelo menos um horário.'))
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

  if (bloqueados > 0) {
    redirect(
      `/dashboard?erroHorarios=${encodeURIComponent(
        `${apagados} horário(s) apagado(s). ${bloqueados} não puderam ser apagados por teres alunos confirmados — bloqueia-os em vez disso.`
      )}`
    )
  }

  redirect('/dashboard')
}
