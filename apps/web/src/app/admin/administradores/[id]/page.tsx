import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { removerAdministrador } from '@/lib/actions/admin'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { MensagemErro, MensagemNota } from '@/components/mensagem'
import type { PerfisEscolaTipo } from '@ccg/types'

const ROTULO_TIPO: Record<string, string> = {
  conta: 'Conta CCG',
  professor: 'Professor',
  admin: 'Administração',
}

// A ficha de um administrador. Só tem uma coisa para fazer — tirar-lhe o
// acesso — e é por isso que é uma página e não um botão na lista: uma
// ação que fecha portas a uma pessoa merece um ecrã onde se lê o nome e
// o email antes de a fazer.
export default async function AdministradorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ erro?: string }>
}) {
  const { id } = await params
  const { erro } = await searchParams

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

  const { data } = await supabase
    .from('perfis_escola')
    .select('id, tipo, admin, super_admin, profiles!inner(nome, email)')
    .eq('id', id)
    .maybeSingle()

  const pessoa = data as unknown as {
    id: string
    tipo: PerfisEscolaTipo
    admin: boolean
    super_admin: boolean
    profiles: { nome: string; email: string | null } | null
  } | null

  if (!pessoa) {
    notFound()
  }

  const souEu = pessoa.id === user.id
  const nome = pessoa.profiles?.nome?.trim() || 'Sem nome'

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-permissoes-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link
            href="/admin/administradores"
            className="partitura-voltar"
            aria-label="Voltar aos administradores"
          >
            ←
          </Link>
          <div>
            <p className="partitura-sobretitulo">Administrador</p>
            <h1>{nome}</h1>
            <p>
              {pessoa.profiles?.email} · {ROTULO_TIPO[pessoa.tipo] ?? pessoa.tipo}
            </p>
          </div>
        </header>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}

        <section className="space-y-3 pt-2">
          <h2 className="font-semibold">Acesso</h2>
          {!pessoa.admin && (
            <p className="text-sm text-foreground/70">Esta pessoa não é administradora.</p>
          )}

          {pessoa.admin && pessoa.super_admin && (
            <MensagemNota>
              É super administrador. O acesso à administração não se tira daqui.
            </MensagemNota>
          )}

          {pessoa.admin && souEu && !pessoa.super_admin && (
            <MensagemNota>
              És tu. Não podes tirar o teu próprio acesso — ficarias fora da administração sem
              ninguém para te repor.
            </MensagemNota>
          )}

          {pessoa.admin && !pessoa.super_admin && !souEu && (
            <>
              <p className="text-sm text-foreground/70">
                Tem acesso à gestão integral da escola: alunos, professores e pagamentos.
              </p>
              <BotaoAcaoDestruir
                label="Remover da administração"
                variante="bloco"
                titulo="Remover da administração?"
                mensagem={`${nome} deixa de ter acesso à gestão da escola. A conta continua a existir.`}
                action={removerAdministrador}
              >
                <input type="hidden" name="userId" value={pessoa.id} />
              </BotaoAcaoDestruir>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
