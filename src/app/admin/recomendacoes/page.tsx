import Link from 'next/link'
import type { CSSProperties } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'

type RecomendacaoLinha = {
  id: number
  recomendador_nome: string
  novo_aluno_nome: string
  professor_nome: string
  modalidade: string | null
  estado: string
  criado_em: string
}

const ESTADO_LABEL: Record<string, string> = {
  registada: 'Por validar',
  validada: 'Validada',
  anulada: 'Anulada',
}

// Reaproveita as cores já usadas nas presenças e nas mensalidades, para
// "validada" ler como verde e "anulada" como vermelho sem inventar
// vocabulário visual novo.
const ESTADO_CLASSE: Record<string, string> = {
  registada: 'estado-falta_aviso',
  validada: 'estado-presente',
  anulada: 'estado-falta_sem_aviso',
}

export default async function RecomendacoesPage({
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
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfilAtual?.admin) {
    redirect('/dashboard')
  }

  const { data: recomendacoesData } = await supabase
    .from('recomendacoes')
    .select('id, recomendador_nome, novo_aluno_nome, professor_nome, modalidade, estado, criado_em')
    .order('criado_em', { ascending: false })
  const recomendacoes = (recomendacoesData ?? []) as RecomendacaoLinha[]

  const { data: beneficiosData } = await supabase.from('beneficios').select('estado')
  const beneficios = beneficiosData ?? []

  const porValidar = recomendacoes.filter((r) => r.estado === 'registada').length
  const validadas = recomendacoes.filter((r) => r.estado === 'validada').length
  const pendentes = beneficios.filter((b) => b.estado === 'pendente').length
  const usados = beneficios.filter((b) => b.estado === 'usado').length

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div
          className="entrada-esquerda flex items-center gap-3"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <BackButton href="/admin" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Programa de Recomendação</h1>
            <p className="text-sm text-foreground/60">Projeto-piloto — ano letivo 2026/2027.</p>
          </div>
        </div>

        {erro && <p className="text-sm text-red-600">{decodeURIComponent(erro)}</p>}

        <section
          className="entrada-esquerda grid grid-cols-2 gap-3 sm:grid-cols-4"
          style={{ '--card-index': 1 } as CSSProperties}
        >
          <div className="stat-tile">
            <p className="stat-tile-numero">{porValidar}</p>
            <p className="stat-tile-legenda">Por validar</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{validadas}</p>
            <p className="stat-tile-legenda">Validadas</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{pendentes}</p>
            <p className="stat-tile-legenda">Meses por usar</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{usados}</p>
            <p className="stat-tile-legenda">Meses já dados</p>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/recomendacoes/nova"
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Registar recomendação
          </Link>
          <Link
            href="/admin/recomendacoes/estudo"
            className="rounded border border-foreground/20 px-4 py-2 text-sm"
          >
            Dados para o estudo
          </Link>
        </div>

        <section className="space-y-3">
          <h2 className="secao-titulo">Todas as recomendações</h2>
          {recomendacoes.length === 0 ? (
            <p className="text-sm text-foreground/60">
              Ainda não há recomendações registadas.
            </p>
          ) : (
            <div className="space-y-2">
              {recomendacoes.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/recomendacoes/${r.id}`}
                  className="lista-item flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="lista-item-titulo">
                      {r.recomendador_nome} → {r.novo_aluno_nome}
                    </p>
                    <p className="lista-item-sub">
                      {r.professor_nome}
                      {r.modalidade && ` — ${r.modalidade}`}
                    </p>
                  </div>
                  <span className={`estado-pill ${ESTADO_CLASSE[r.estado] ?? ''}`}>
                    {ESTADO_LABEL[r.estado] ?? r.estado}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
