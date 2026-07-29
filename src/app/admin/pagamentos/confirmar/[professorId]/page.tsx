import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import {
  definirValorMensal,
  marcarMensalidadePaga,
  definirNumeroFatura,
} from '@/lib/actions/pagamentos'

type MatriculaResumo = {
  id: number
  aluno_id: string
  valor_mensal: number | null
  aluno: { nome: string } | null
  instrumentos: { nome: string } | null
}

type MensalidadeResumo = {
  matricula_id: number
  pago: boolean
  numero_fatura: string | null
}

export default async function ConfirmarMensalidadesProfessorPage({
  params,
  searchParams,
}: {
  params: Promise<{ professorId: string }>
  searchParams: Promise<{ erro?: string }>
}) {
  const { professorId } = await params
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

  const { data: professorData } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', professorId)
    .eq('tipo', 'professor')
    .maybeSingle()

  if (!professorData) {
    notFound()
  }

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select(
      'id, aluno_id, valor_mensal, aluno:alunos(nome), instrumentos(nome)'
    )
    .eq('professor_id', professorId)
    .eq('estado', 'confirmado')
  const matriculas = (matriculasData ?? []) as unknown as MatriculaResumo[]

  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth() + 1

  const matriculaIds = matriculas.map((m) => m.id)
  const { data: mensalidadesData } =
    matriculaIds.length > 0
      ? await supabase
          .from('mensalidades')
          .select('matricula_id, pago, numero_fatura')
          .eq('ano', ano)
          .eq('mes', mes)
          .in('matricula_id', matriculaIds)
      : { data: [] }
  const mensalidadePorMatricula = new Map(
    ((mensalidadesData ?? []) as MensalidadeResumo[]).map((m) => [m.matricula_id, m])
  )

  // Só os que ainda faltam confirmar (não pagos este mês) — assim que
  // marcados como pagos, desaparecem desta lista.
  const porConfirmar = matriculas
    .filter((m) => !(mensalidadePorMatricula.get(m.id)?.pago ?? false))
    .sort((a, b) => (a.aluno?.nome ?? '').localeCompare(b.aluno?.nome ?? ''))

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin/pagamentos/confirmar" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{professorData.nome}</h1>
            <p className="text-sm text-foreground/60">
              Mês atual: {String(mes).padStart(2, '0')}/{ano}
            </p>
          </div>
        </div>

        {erro && <p className="text-sm text-red-600">{decodeURIComponent(erro)}</p>}

        {porConfirmar.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Não há mensalidades por confirmar este mês.
          </p>
        ) : (
          <div className="space-y-2">
            {porConfirmar.map((m) => {
              const numeroFatura = mensalidadePorMatricula.get(m.id)?.numero_fatura ?? ''
              return (
                <div key={m.id} className="lista-item space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="lista-item-titulo">{m.aluno?.nome}</p>
                      <p className="lista-item-sub">{m.instrumentos?.nome}</p>
                    </div>
                    <form action={marcarMensalidadePaga}>
                      <input type="hidden" name="matriculaId" value={m.id} />
                      <input type="hidden" name="alunoId" value={m.aluno_id} />
                      <input type="hidden" name="professorId" value={professorId} />
                      <input
                        type="hidden"
                        name="instrumentoNome"
                        value={m.instrumentos?.nome ?? ''}
                      />
                      <input type="hidden" name="ano" value={ano} />
                      <input type="hidden" name="mes" value={mes} />
                      <input type="hidden" name="valor" value={m.valor_mensal ?? 0} />
                      <input type="hidden" name="pago" value="true" />
                      <input type="hidden" name="numeroFatura" value={numeroFatura} />
                      <button
                        type="submit"
                        disabled={m.valor_mensal === null}
                        className="rounded border border-foreground/20 px-3 py-1 text-sm text-foreground"
                      >
                        Marcar como pago
                      </button>
                    </form>
                  </div>
                  <form action={definirValorMensal} className="flex items-center gap-2">
                    <input type="hidden" name="matriculaId" value={m.id} />
                    <label className="text-xs text-foreground/60">Valor mensal (€)</label>
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
                  <form action={definirNumeroFatura} className="flex items-center gap-2">
                    <input type="hidden" name="matriculaId" value={m.id} />
                    <input type="hidden" name="alunoId" value={m.aluno_id} />
                    <input type="hidden" name="professorId" value={professorId} />
                    <input
                      type="hidden"
                      name="instrumentoNome"
                      value={m.instrumentos?.nome ?? ''}
                    />
                    <input type="hidden" name="ano" value={ano} />
                    <input type="hidden" name="mes" value={mes} />
                    <input type="hidden" name="valor" value={m.valor_mensal ?? 0} />
                    <input type="hidden" name="pago" value="false" />
                    <label className="text-xs text-foreground/60">Nº fatura</label>
                    <input
                      type="text"
                      name="numeroFatura"
                      defaultValue={numeroFatura}
                      placeholder="ex: FT 2026/123"
                      className="w-32 rounded border border-foreground/20 px-2 py-1 text-sm"
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
        )}
      </div>
    </main>
  )
}
