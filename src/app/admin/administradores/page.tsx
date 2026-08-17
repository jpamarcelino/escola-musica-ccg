import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarAdministradores } from '@/lib/actions/admin'
import { criarConviteAdmin } from '@/lib/actions/convites'
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
    <main id="conteudo-principal" className="partitura-pagina admin-permissoes-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><Link href="/admin" className="partitura-voltar" aria-label="Voltar à visão geral">←</Link><div><p className="partitura-sobretitulo">Super administração</p><h1>Administradores</h1><p>Acessos à gestão integral da escola.</p></div></header>

        <ConvidarAdminForm action={criarConviteAdmin} />

        {/* O aviso estava em text-foreground/50 e solto entre o convite e
            a lista. Explica a regra desta lista, por isso vive com ela. */}
        <form action={atualizarAdministradores} className="admin-permissoes-form">
          <p className="admin-permissoes-nota">
            Quem estiver marcado ganha acesso à gestão integral da escola —
            alunos, professores e pagamentos. Não te consegues desmarcar a ti
            próprio, para nunca ficares sem acesso.
          </p>
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
          {/* Colado ao fundo do ecrã: a lista tem 18 nomes e o botão ficava
              a 1500px do topo. Marcava-se uma caixa em cima e era preciso
              percorrer tudo para gravar — e quem não percorresse saía da
              página convencido de que tinha guardado. */}
          <div className="admin-permissoes-guardar">
            <button type="submit" className="botao-cartao">
              Guardar administradores
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
import Link from 'next/link'
