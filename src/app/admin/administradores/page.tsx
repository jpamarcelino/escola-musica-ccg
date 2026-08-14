import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarAdministradores } from '@/lib/actions/admin'
import { criarConviteAdmin } from '@/lib/actions/convites'
import { PageHeader } from '@/components/page-header'
import { ConvidarAdminForm } from '@/components/convite-forms'

type Professor = {
  id: string
  nome: string
  tipo: string
  admin: boolean
}

export default async function AdminAdministradoresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('perfis_escola')
    .select('super_admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.super_admin) {
    redirect('/admin')
  }

  const { data: professoresData } = await supabase
    .from('perfis_escola')
    .select('id, tipo, admin, profiles(nome)')
    .in('tipo', ['professor', 'admin'])
    .order('nome', { referencedTable: 'profiles' })
  const professores = (
    (professoresData ?? []) as unknown as {
      id: string
      tipo: string
      admin: boolean
      profiles: { nome: string } | null
    }[]
  ).map((p) => ({
    id: p.id,
    nome: p.profiles?.nome ?? '',
    tipo: p.tipo,
    admin: p.admin,
  })) as Professor[]

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/admin" titulo="Administradores" />

        <ConvidarAdminForm action={criarConviteAdmin} />

        <p className="text-xs text-foreground/50">
          Quem estiver marcado ganha acesso à Visão geral. Não te consegues
          desmarcar a ti próprio, para nunca ficares sem acesso.
        </p>

        <form action={atualizarAdministradores} className="space-y-3">
          <div className="space-y-2">
            {professores.map((professor) => {
              const souEu = professor.id === user.id
              return (
                <label key={professor.id} className="lista-item flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="admins"
                    value={professor.id}
                    defaultChecked={professor.admin}
                    disabled={souEu}
                  />
                  {souEu && <input type="hidden" name="admins" value={professor.id} />}
                  <span className="text-sm text-foreground">
                    {professor.nome} {souEu && '(tu)'}{' '}
                    <span className="text-xs text-foreground/50">
                      ({professor.tipo === 'admin' ? 'admin' : 'professor'})
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
          <button type="submit" className="botao-cartao">
            Guardar administradores
          </button>
        </form>
      </div>
    </main>
  )
}
