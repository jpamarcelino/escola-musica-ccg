import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tornarAdministrador } from '@/lib/actions/admin'
import { EmptyState } from '@/components/empty-state'
import { MensagemErro } from '@/components/mensagem'
import { classesCampo } from '@/components/campo-formulario'
import type { PerfisEscolaTipo } from '@ccg/types'
import { VoltarAtras } from '@/components/voltar-atras'

const ROTULO_TIPO: Record<string, string> = {
  conta: 'Conta CCG',
  professor: 'Professor',
  admin: 'Administração',
}

type Pessoa = {
  id: string
  nome: string
  email: string | null
  tipo: PerfisEscolaTipo
  admin: boolean
  super_admin: boolean
}

function paraPessoas(linhas: unknown): Pessoa[] {
  return ((linhas ?? []) as {
    id: string
    tipo: PerfisEscolaTipo
    admin: boolean
    super_admin: boolean
    profiles: { nome: string; email: string | null } | null
  }[]).map((p) => ({
    id: p.id,
    nome: p.profiles?.nome?.trim() || 'Sem nome',
    email: p.profiles?.email ?? null,
    tipo: p.tipo,
    admin: p.admin,
    super_admin: p.super_admin,
  }))
}

// Quem tem acesso à gestão integral da escola.
//
// Era uma lista com todos os professores e uma caixa à frente de cada
// um. Isso responde à pergunta errada: para saber quem é administrador
// era preciso procurar as três caixas marcadas no meio de dezoito nomes,
// e promover alguém que não desse aulas era impossível.
//
// Agora a lista são só os administradores. Quem lá não está, procura-se
// pelo email — que é o que a secretaria tem à mão quando alguém pede
// acesso, e o que identifica uma pessoa sem ambiguidade.
export default async function AdminAdministradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; erro?: string }>
}) {
  const { q, erro } = await searchParams
  const procura = (q ?? '').trim()

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

  const { data: adminsData } = await supabase
    .from('perfis_escola')
    .select('id, tipo, admin, super_admin, profiles!inner(nome, email)')
    .eq('admin', true)
    .order('nome', { referencedTable: 'profiles' })
  const admins = paraPessoas(adminsData)

  // A procura é por email inteiro ou por parte dele. Só se faz quando há
  // pelo menos três caracteres: com um só, isto devolvia meia escola.
  let resultados: Pessoa[] = []
  if (procura.length >= 3) {
    const { data } = await supabase
      .from('perfis_escola')
      .select('id, tipo, admin, super_admin, profiles!inner(nome, email)')
      .ilike('profiles.email', `%${procura}%`)
      .limit(10)
    resultados = paraPessoas(data)
  }

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-permissoes-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <VoltarAtras destino="/admin" className="partitura-voltar" rotulo="Voltar à visão geral">←</VoltarAtras>
          <div>
            <p className="partitura-sobretitulo">Super administração</p>
            <h1>Administradores</h1>
            <p>
              {admins.length} {admins.length === 1 ? 'pessoa tem' : 'pessoas têm'} acesso à gestão
              integral da escola.
            </p>
          </div>
        </header>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}

        <section className="space-y-3 pt-2">
          <h2 className="font-semibold">Adicionar</h2>
          {/* Um GET e não uma Server Action: a procura fica no URL, dá
              para voltar atrás e para recarregar sem repetir nada. */}
          <form method="get" className="flex flex-wrap gap-2">
            <input
              type="search"
              name="q"
              defaultValue={procura}
              placeholder="Email da pessoa"
              aria-label="Procurar pessoa por email"
              className={`${classesCampo} flex-1 min-w-[220px]`}
            />
            <button type="submit" className="botao-cartao">
              Procurar
            </button>
          </form>

          {procura.length > 0 && procura.length < 3 && (
            <p className="text-sm text-foreground/60">Escreve pelo menos três caracteres.</p>
          )}

          {procura.length >= 3 && resultados.length === 0 && (
            <p className="text-sm text-foreground/60">
              Ninguém com esse email. A pessoa tem de ter conta na app para poder ser
              administrador.
            </p>
          )}

          {resultados.map((pessoa) => (
            <div key={pessoa.id} className="lista-item flex flex-wrap items-center gap-3">
              <span className="flex-1">
                <span className="lista-item-titulo block">{pessoa.nome}</span>
                <span className="lista-item-sub">
                  {pessoa.email} · {ROTULO_TIPO[pessoa.tipo] ?? pessoa.tipo}
                </span>
              </span>
              {pessoa.admin ? (
                <span className="text-sm text-foreground/60">Já é administrador</span>
              ) : (
                <form action={tornarAdministrador}>
                  <input type="hidden" name="userId" value={pessoa.id} />
                  <button type="submit" className="botao-cartao">
                    Dar acesso
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>

        <section className="space-y-3 border-t border-[var(--color-linha)] pt-6">
          <h2 className="font-semibold">Com acesso</h2>
          {admins.length === 0 ? (
            <EmptyState titulo="Ainda ninguém tem acesso à administração" />
          ) : (
            <div className="space-y-2">
              {admins.map((pessoa) => (
                <Link
                  key={pessoa.id}
                  href={`/admin/administradores/${pessoa.id}`}
                  className="lista-item flex items-center gap-3"
                >
                  <span className="flex-1">
                    <span className="lista-item-titulo block">
                      {pessoa.nome}
                      {pessoa.id === user.id && ' (tu)'}
                    </span>
                    <span className="lista-item-sub">
                      {pessoa.email}
                      {pessoa.super_admin && ' · super administrador'}
                    </span>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
