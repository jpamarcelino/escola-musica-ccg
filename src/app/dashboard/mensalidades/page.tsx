import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { GrupoLista, LinhaLista } from '@/components/lista'
import { MensagemInfo } from '@/components/mensagem'
import { MESES_ANO_LETIVO } from '@/lib/ano-letivo'

type MatriculaDoProfessor = {
  id: number
  aluno_id: string
  valor_mensal: number | null
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
}

type MensalidadeDoMes = {
  aluno_id: string
  valor: number | null
  pago: boolean
  desistencia: boolean
  beneficio_id: number | null
  instrumento_nome: string | null
}

type EstadoLinha = 'nao_devida' | 'paga' | 'por_pagar' | 'por_gerar' | 'desistencia'

const ESTADO: Record<EstadoLinha, { label: string; classe: string }> = {
  nao_devida: { label: 'Não devida — Programa de Recomendação', classe: 'estado-falta_aviso' },
  paga: { label: 'Paga', classe: 'estado-presente' },
  por_pagar: { label: 'Por pagar', classe: 'estado-falta_sem_aviso' },
  por_gerar: { label: 'Ainda não gerada', classe: '' },
  desistencia: { label: 'Desistiu', classe: '' },
}

function mesPredefinido() {
  const agora = new Date()
  const chave = agora.getFullYear() * 12 + agora.getMonth() + 1
  const dentroDoAno = MESES_ANO_LETIVO.find((m) => m.ano * 12 + m.mes === chave)
  return dentroDoAno ?? MESES_ANO_LETIVO[0]
}

export default async function MensalidadesProfessorPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const { ano: anoParam, mes: mesParam } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const escolhido =
    MESES_ANO_LETIVO.find(
      (m) => String(m.ano) === anoParam && String(m.mes) === mesParam
    ) ?? mesPredefinido()

  const [{ data: perfilAtual }, { data: matriculasData }, { data: mensalidadesData }] =
    await Promise.all([
      supabase
        .from('perfis_escola')
        .select('tipo, adere_recomendacao')
        .eq('id', user.id)
        .single(),
      supabase
        .from('matriculas')
        .select('id, aluno_id, valor_mensal, alunos(nome), instrumentos(nome)')
        .eq('professor_id', user.id)
        .eq('estado', 'confirmado'),
      supabase
        .from('mensalidades')
        .select('aluno_id, valor, pago, desistencia, beneficio_id, instrumento_nome')
        .eq('professor_id', user.id)
        .eq('ano', escolhido.ano)
        .eq('mes', escolhido.mes),
    ])

  if (perfilAtual?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const matriculas = (matriculasData ?? []) as unknown as MatriculaDoProfessor[]
  const mensalidades = (mensalidadesData ?? []) as MensalidadeDoMes[]

  // A identidade de uma mensalidade é (aluno, professor, ano, mês) desde
  // a 0008 — não a matrícula. Por isso a chave aqui é o aluno.
  const mensalidadePorAluno = new Map(mensalidades.map((m) => [m.aluno_id, m]))

  const linhas = matriculas
    .map((m) => {
      const mensalidade = mensalidadePorAluno.get(m.aluno_id)
      let estado: EstadoLinha
      if (!mensalidade) estado = 'por_gerar'
      else if (mensalidade.desistencia) estado = 'desistencia'
      else if (mensalidade.beneficio_id !== null) estado = 'nao_devida'
      else if (mensalidade.pago) estado = 'paga'
      else estado = 'por_pagar'

      return {
        chave: m.id,
        nome: m.alunos?.nome ?? '',
        disciplina: m.instrumentos?.nome ?? mensalidade?.instrumento_nome ?? '',
        valor: mensalidade?.valor ?? m.valor_mensal,
        estado,
      }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const naoDevidas = linhas.filter((l) => l.estado === 'nao_devida')
  const porPagar = linhas.filter((l) => l.estado === 'por_pagar')
  const pagas = linhas.filter((l) => l.estado === 'paga')

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader voltar="/dashboard" titulo="Mensalidades" subtitulo={<>{escolhido.label} de {escolhido.ano}</>} />

        <nav
          aria-label="Escolher mês"
          className="-mx-6 flex gap-[8px] overflow-x-auto px-6 pb-[4px] [scrollbar-width:none]"
        >
          {MESES_ANO_LETIVO.map((m) => (
            <Link
              key={`${m.ano}-${m.mes}`}
              href={`/dashboard/mensalidades?ano=${m.ano}&mes=${m.mes}`}
              className={
                m.ano === escolhido.ano && m.mes === escolhido.mes
                  ? 'flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-pill)] bg-brand px-[16px] text-[13px] font-semibold text-white'
                  : 'flex min-h-[44px] shrink-0 items-center rounded-[var(--radius-pill)] border border-foreground/20 px-[16px] text-[13px] font-medium'
              }
              aria-current={m.ano === escolhido.ano && m.mes === escolhido.mes ? 'page' : undefined}
            >
              {m.label.slice(0, 3)} {String(m.ano).slice(-2)}
            </Link>
          ))}
        </nav>

        <section className="grid grid-cols-3 gap-3">
          <div className="stat-tile">
            <p className="stat-tile-numero">{pagas.length}</p>
            <p className="stat-tile-legenda">Pagas</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{porPagar.length}</p>
            <p className="stat-tile-legenda">Por pagar</p>
          </div>
          <div className="stat-tile">
            <p className="stat-tile-numero">{naoDevidas.length}</p>
            <p className="stat-tile-legenda">Não devidas</p>
          </div>
        </section>

        {naoDevidas.length > 0 && (
          <MensagemInfo>
            {naoDevidas.length === 1
              ? 'Uma das mensalidades deste mês está abrangida pelo Programa de Recomendação — não há pagamento a receber por ela'
              : `${naoDevidas.length} mensalidades deste mês estão abrangidas pelo Programa de Recomendação — não há pagamento a receber por elas`}
            , porque a tua parcela e a do CCG foram oferecidas ao aluno que trouxe um novo
            aluno para as tuas aulas.
          </MensagemInfo>
        )}

        {linhas.length === 0 ? (
          <EmptyState titulo="Não tens alunos com matrícula confirmada" />
        ) : (
          <GrupoLista>
            {linhas.map((l) => (
              <LinhaLista
                key={l.chave}
                titulo={l.nome}
                contexto={`${l.disciplina}${l.estado === 'nao_devida' ? ' · 0,00 €' : l.valor !== null ? ` · ${l.valor.toFixed(2).replace('.', ',')} €` : ''}`}
                direita={
                  <span className={`estado-pill ${ESTADO[l.estado].classe}`}>
                    {ESTADO[l.estado].label}
                  </span>
                }
              />
            ))}
          </GrupoLista>
        )}

        {!perfilAtual.adere_recomendacao && (
          <p className="text-sm text-foreground/60">
            Não aderiste ao Programa de Recomendação, por isso nenhuma das tuas mensalidades
            será abrangida. A adesão faz-se junto da secretaria.
          </p>
        )}
      </div>
    </main>
  )
}
