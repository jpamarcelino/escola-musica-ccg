'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function atualizarAdministradores(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.admin) {
    redirect('/dashboard')
  }

  const { data: professores } = await supabase
    .from('profiles')
    .select('id')
    .eq('tipo', 'professor')

  const idsAdmin = new Set(formData.getAll('admins').map(String))

  for (const professor of professores ?? []) {
    const deveSerAdmin = idsAdmin.has(professor.id)
    await supabase
      .from('profiles')
      .update({ admin: deveSerAdmin })
      .eq('id', professor.id)
  }

  revalidatePath('/admin')
}
