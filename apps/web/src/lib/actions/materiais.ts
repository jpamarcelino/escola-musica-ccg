'use server'

import { revalidatePath } from 'next/cache'
import { extrairIdYoutube } from '@ccg/core'
import { createClient } from '@/lib/supabase/server'

export type VideoEncontrado = {
  youtubeId: string
  titulo: string
  canal: string
}

export type EstadoProcura = {
  erro?: string
  video?: VideoEncontrado
}

// Ir buscar o título ao YouTube a partir do link.
//
// Usa o oEmbed, que é público: não precisa de chave, de conta nem de
// quota, e funciona com vídeos não listados. Serve duas coisas ao mesmo
// tempo — poupa ao professor escrever o título, e confirma que o link
// aponta mesmo para um vídeo que existe. Um link mal copiado dá erro
// aqui, e não um cartão partido no caderno do aluno três dias depois.
//
// Tem de ser no servidor: o endpoint do YouTube não manda cabeçalhos de
// CORS, e o browser recusaria o pedido.
export async function procurarVideo(
  _prevState: EstadoProcura,
  formData: FormData
): Promise<EstadoProcura> {
  const link = String(formData.get('link') ?? '')
  const youtubeId = extrairIdYoutube(link)

  if (!youtubeId) {
    return { erro: 'Isto não parece um link do YouTube. Copia o endereço do vídeo e cola aqui.' }
  }

  try {
    const resposta = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${youtubeId}`
      )}&format=json`,
      // Sem cache: o professor pode ter acabado de mudar o título, e o
      // pedido é raro o suficiente para não valer a pena guardá-lo.
      { cache: 'no-store', signal: AbortSignal.timeout(8000) }
    )

    if (!resposta.ok) {
      // 401/404 aqui quer dizer, quase sempre, vídeo privado ou apagado.
      // Um vídeo PRIVADO não serve: o aluno não o conseguiria abrir.
      return {
        erro:
          'O YouTube não devolveu este vídeo. Confirma que existe e que está como "Não listado" — se estiver "Privado", o aluno não o consegue ver.',
      }
    }

    const dados = (await resposta.json()) as { title?: string; author_name?: string }

    return {
      video: {
        youtubeId,
        titulo: (dados.title ?? '').slice(0, 160),
        canal: dados.author_name ?? '',
      },
    }
  } catch {
    return { erro: 'Não foi possível falar com o YouTube. Tenta outra vez daqui a pouco.' }
  }
}

export type EstadoEnvio = {
  erro?: string
  enviadoA?: number
}

export async function publicarVideo(
  _prevState: EstadoEnvio,
  formData: FormData
): Promise<EstadoEnvio> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Sessão expirada. Entra outra vez.' }
  }

  const youtubeId = extrairIdYoutube(String(formData.get('youtubeId') ?? ''))
  const titulo = String(formData.get('titulo') ?? '').trim().slice(0, 160)
  const descricao = String(formData.get('descricao') ?? '').trim().slice(0, 600)
  const alunos = formData.getAll('alunos').map(String).filter(Boolean)

  if (!youtubeId) {
    return { erro: 'Falta o vídeo. Cola o link outra vez.' }
  }
  if (titulo === '') {
    return { erro: 'O vídeo precisa de um título.' }
  }
  if (alunos.length === 0) {
    return { erro: 'Escolhe pelo menos um aluno.' }
  }

  // Quem manda no alcance real é a função (0048): confirma que estes
  // alunos são mesmo deste professor e que têm aulas a decorrer. O que se
  // valida aqui é só o que dá para dizer sem ir à base.
  const { error } = await supabase.rpc('publicar_material', {
    p_youtube_id: youtubeId,
    p_titulo: titulo,
    p_descricao: descricao,
    p_alunos: alunos,
  })

  if (error) {
    return { erro: error.message }
  }

  revalidatePath('/dashboard/enviar-material')

  return { enviadoA: alunos.length }
}
