import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { definirValorMensal, marcarMensalidadePaga } from '@/lib/actions/pagamentos'

type Professor = {
  id: string
  nome: string
  programa: string | null
}

type MatriculaResumo = {
  id: number
  professor_id: string
  valor_mensal: number | null
  aluno: { nome: string } | null
  instrumentos: { nome: string } | null
}

type MensalidadeResumo = {
  matricula_id: number
  pago: boolean
}

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const { erro } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: professoresData } = await supabase
    .from('profiles')
    .select('id, nome, programa')
    .eq('tipo', 'professor')
    .order('nome')
  const professores = (professoresData ?? []) as Professor[]

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select(
      'id, professor_id, valor_mensal, aluno:profiles!matriculas_aluno_id_fkey(nome), instrumentos(nome)'
    )
    .eq('estado', 'confirmado')
    .order('criado_em')
  const matriculas = (matriculasData ?? []) as unknown as MatriculaResumo[]

  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth() + 1

  const matriculaIds = matriculas.map((m) => m.id)
  const { data: mensalidadesData } =
    matriculaIds.length > 0
      ? await supabase
          .from('mensalidades')
          .select('matricula_id, pago')
          .eq('ano', ano)
          .eq('mes', mes)
          .in('matricula_id', matriculaIds)
      : { data: [] }
  const pagoPorMatricula = new Map(
    ((mensalidadesData ?? []) as MensalidadeResumo[]).map((m) => [m.matricula_id, m.pago])
  )

  const matriculasPorProfessor = new Map<string, MatriculaResumo[]>()
  for (const m of matriculas) {
    const lista = matriculasPorProfessor.get(m.professor_id) ?? []
    lista.push(m)
    matriculasPorProfessor.set(m.professor_id, lista)
  }

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-3xl space-y-8 text-left">
        <div
          className="entrada-esquerda flex items-center gap-3"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <BackButton href="/admin" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Mensalidades</h1>
            <p className="text-sm text-foreground/60">
              Mês atual: {String(mes).padStart(2, '0')}/{ano}. Lembrete enviado no dia 1,
              aviso final no dia 20 a quem ainda não estiver marcado como pago.
            </p>
          </div>
        </div>

        {erro && <p className="text-sm text-red-600">{decodeURIComponent(erro)}</p>}

        {professores.map((professor, idx) => {
          const matriculasDoProfessor = matriculasPorProfessor.get(professor.id) ?? []
          if (matriculasDoProfessor.length === 0) return null

          return (
            <section
              key={professor.id}
              className="entrada-esquerda space-y-3"
              style={{ '--card-index': idx + 1 } as CSSProperties}
            >
              <h2 className="secao-titulo">
                {professor.nome}{' '}
                <span className="font-sans text-xs font-normal text-foreground/50">
                  (
                  {professor.programa === 'musica'
                    ? 'Música'
                    : professor.programa === 'danca'
                      ? 'Dança'
                      : 'sem escola'}
                  )
                </span>
              </h2>
              <div className="space-y-2">
                {matriculasDoProfessor.map((m) => {
                  const pago = pagoPorMatricula.get(m.id) ?? false
                  return (
                    <div key={m.id} className="lista-item space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="lista-item-titulo">{m.aluno?.nome}</p>
                          <p className="lista-item-sub">{m.instrumentos?.nome}</p>
                        </div>
                        <form action={marcarMensalidadePaga}>
                          <input type="hidden" name="matriculaId" value={m.id} />
                          <input type="hidden" name="ano" value={ano} />
                          <input type="hidden" name="mes" value={mes} />
                          <input type="hidden" name="valor" value={m.valor_mensal ?? 0} />
                          <input type="hidden" name="pago" value={(!pago).toString()} />
                          <button
                            type="submit"
                            disabled={m.valor_mensal === null}
                            className={`rounded border px-3 py-1 text-sm ${
                              pago
                                ? 'border-green-600/40 text-green-700'
                                : 'border-foreground/20 text-foreground'
                            }`}
                          >
                            {pago ? 'Pago ✓' : 'Marcar como pago'}
                          </button>
                        </form>
                      </div>
                      <form action={definirValorMensal} className="flex items-center gap-2">
                        <input type="hidden" name="matriculaId" value={m.id} />
                        <label className="text-xs text-foreground/60">
                          Valor mensal (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="valor"
                          defaultValue={m.valor_mensal ?? ''}
                          className="w-24 rounded border border-foreground/20 px-2 py-1 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded border border-foreground/20 px-2 py-1 text-xs"
                        >
                          Guardar
                        </button>
                      </form>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
