'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// A ficha pública de um professor — foto e biografia — é editada pela
// secretaria, nunca pelo próprio. Ambas aparecem a quem ainda não é aluno
// e representam a escola.
//
// Quem manda é `definir_ficha_publica` (0050) e a policy do bucket: esta
// ação sem privilégios de administrador não consegue escrever nada.
export async function guardarFichaProfessor(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const professorId = String(formData.get('professorId') ?? '')
  const bio = String(formData.get('bio') ?? '').slice(0, 1200)
  const ficheiro = formData.get('foto')

  function voltarComErro(mensagem: string): never {
    redirect(
      `/admin/professores/${professorId}/conta?erro=${encodeURIComponent(mensagem)}`
    )
  }

  if (!professorId) {
    redirect('/admin/professores')
  }

  let fotoUrl: string | null = null

  if (ficheiro instanceof File && ficheiro.size > 0) {
    if (!ficheiro.type.startsWith('image/')) {
      voltarComErro('A foto tem de ser uma imagem.')
    }
    // Margem abaixo do limite das Server Actions (10 MB, next.config.ts),
    // para dar erro claro em vez de a plataforma recusar o pedido a meio.
    if (ficheiro.size > 9 * 1024 * 1024) {
      voltarComErro('Essa foto é demasiado grande (máximo 9 MB).')
    }

    const caminho = `${professorId}/foto`
    const { error: erroUpload } = await supabase.storage
      .from('fotos-professores')
      .upload(caminho, ficheiro, { upsert: true, contentType: ficheiro.type })

    if (erroUpload) {
      voltarComErro('Não foi possível carregar a foto. Tenta novamente.')
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('fotos-professores').getPublicUrl(caminho)

    // O caminho no Storage é sempre o mesmo, por isso a query string é o
    // que faz a foto nova aparecer em vez da que está em cache.
    fotoUrl = `${publicUrl}?v=${Date.now()}`
  }

  const { error } = await supabase.rpc('definir_ficha_publica', {
    p_professor: professorId,
    p_bio: bio,
    p_foto_url: fotoUrl,
  })

  if (error) {
    voltarComErro(error.message)
  }

  revalidatePath(`/admin/professores/${professorId}/conta`)
  revalidatePath(`/professor/${professorId}`)
  redirect(`/admin/professores/${professorId}/conta?guardado=1`)
}
