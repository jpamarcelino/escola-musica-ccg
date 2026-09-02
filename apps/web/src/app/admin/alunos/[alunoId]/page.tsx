import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/empty-state'
import { formatarSala, calcularIdade, euros, eurosOuTexto, type DiaSemana } from '@ccg/core'
import type { MatriculaEstado, PresencaEstado } from '@ccg/types'
import { VoltarAtras } from '@/components/voltar-atras'

type AlunoPerfil = {
  nome: string
  data_nascimento: string | null
  encarregado: { email: string | null; telefone: string | null; nif: string | null } | null
}

type Matricula = {
  id: number
  estado: MatriculaEstado
  professor: { nome: string } | null
  instrumentos: { nome: string } | null
  horarios: {
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

type Presenca = {
  id: number
  data: string
  estado: PresencaEstado
  matricula_id: number
}

type Mensalidade = {
  id: number
  ano: number
  mes: number
  // Nulo nas linhas de desistência ("DT"), que não têm valor a cobrar.
  valor: number | null
  pago: boolean
  numero_fatura: string | null
  instrumento_nome: string | null
  desistencia: boolean
  beneficio_id: number | null
}

const ESTADO_BENEFICIO_LABEL: Record<string, string> = {
  pendente: 'Mês grátis por usar',
  usado: 'Mês grátis usado',
  expirado: 'Mês grátis expirado',
  anulado: 'Mês grátis anulado',
}

// Os quatro estados que uma mensalidade pode ter nesta ficha. As linhas de
// desistência ("DT", criadas por apagar_propria_conta) e as cobertas pelo
// Programa de Recomendação só passaram a chegar aqui depois de a consulta
// deixar de filtrar por matrícula — antes ficavam de fora, e a de
// desistência teria rebentado a página por ter "valor" nulo.
function estadoDaMensalidade(men: Mensalidade) {
  if (men.desistencia) {
    return { label: 'Desistiu', classe: '' }
  }
  if (men.beneficio_id !== null) {
    return { label: 'Não devida — Programa de Recomendação', classe: 'estado-falta_aviso' }
  }
  return men.pago
    ? { label: 'Pago', classe: 'estado-presente' }
    : { label: 'Por pagar', classe: 'estado-falta_sem_aviso' }
}

const ESTADO_PRESENCA_LABEL: Record<string, string> = {
  presente: 'Presente',
  falta_aviso: 'Falta c/ aviso',
  falta_sem_aviso: 'Falta s/ aviso',
}

export default async function AdminAlunoPage({
  params,
}: {
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params

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

  const { data: alunoData } = await supabase
    .from('alunos')
    .select('nome, data_nascimento, encarregado:profiles!alunos_encarregado_id_fkey(email, telefone, nif)')
    .eq('id', alunoId)
    .maybeSingle()
  const aluno = alunoData as unknown as AlunoPerfil | null

  if (!aluno) {
    notFound()
  }

  const { data: matriculasData } = await supabase
    .from('matriculas')
    .select(
      'id, estado, professor:profiles!matriculas_professor_id_fkey(nome), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
    )
    .eq('aluno_id', alunoId)
    .order('criado_em', { ascending: false })
  const matriculas = (matriculasData ?? []) as unknown as Matricula[]
  const matriculaIds = matriculas.map((m) => m.id)

  const { data: presencasData } =
    matriculaIds.length > 0
      ? await supabase
          .from('presencas')
          .select('id, data, estado, matricula_id')
          .in('matricula_id', matriculaIds)
          .order('data', { ascending: false })
      : { data: [] }
  const presencas = (presencasData ?? []) as unknown as Presenca[]

  // Por aluno_id, e não por matricula_id: desde a 0008 a identidade de uma
  // mensalidade é (aluno, professor, ano, mês) e o vínculo à matrícula
  // desliga-se sozinho quando ela é apagada ("on delete set null"),
  // precisamente para o histórico sobreviver. Consultar por matrícula
  // fazia o histórico desaparecer desta ficha assim que o aluno cancelava
  // ou desistia — e nem sequer corria para quem nunca teve matrícula.
  // O nome da disciplina vem do snapshot na própria mensalidade, pela
  // mesma razão.
  const { data: mensalidadesData } = await supabase
    .from('mensalidades')
    .select('id, ano, mes, valor, pago, numero_fatura, instrumento_nome, desistencia, beneficio_id')
    .eq('aluno_id', alunoId)
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
  const mensalidades = (mensalidadesData ?? []) as unknown as Mensalidade[]

  // Programa de Recomendação: o que este aluno ganhou por ter trazido
  // outras pessoas. Quem ele recomendou não se mostra aqui — o Art. 25.º
  // diz que essa relação é de gestão interna e vive só em
  // /admin/recomendacoes.
  const { data: beneficiosData } = await supabase
    .from('beneficios')
    .select('id, estado, ano_uso, mes_uso, valor_coberto, motivo_anulacao, recomendacao_id')
    .eq('aluno_id', alunoId)
    .order('criado_em')
  const beneficios = (beneficiosData ?? []) as unknown as {
    id: number
    estado: string
    ano_uso: number | null
    mes_uso: number | null
    valor_coberto: number | null
    motivo_anulacao: string | null
    recomendacao_id: number
  }[]

  const matriculaPorId = new Map(matriculas.map((m) => [m.id, m]))
  const idade = calcularIdade(aluno.data_nascimento)

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-ficha-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho"><VoltarAtras destino="/admin/alunos" className="partitura-voltar" rotulo="Voltar ao diretório de alunos">←</VoltarAtras><div><p className="partitura-sobretitulo">Ficha de aluno</p><h1>{aluno.nome}</h1><p>{idade !== null ? `${idade} anos · ` : ''}{matriculas.length} {matriculas.length === 1 ? 'matrícula' : 'matrículas'}</p></div></header>

        <div className="admin-ficha-grelha"><aside><section className="admin-ficha-seccao">
          <h2 className="secao-titulo">Encarregado de educação</h2>
          <div className="lista-item space-y-1">
            {aluno.encarregado?.email && (
              <p className="lista-item-sub">Email: {aluno.encarregado.email}</p>
            )}
            {aluno.encarregado?.telefone && (
              <p className="lista-item-sub">Telemóvel: {aluno.encarregado.telefone}</p>
            )}
            {/* O NIF é o de quem paga, e é o que vai na fatura. Aparece
                sempre, mesmo em falta: uma linha ausente lê-se como "não
                é preciso", e esta é a que trava a faturação. */}
            <p className="lista-item-sub">
              NIF: {aluno.encarregado?.nif ?? <strong>por preencher</strong>}
            </p>
            {idade !== null && <p className="lista-item-sub">Idade: {idade} anos</p>}
          </div>
        </section>

        <section className="admin-ficha-seccao">
          <h2 className="secao-titulo">Horário e professor</h2>
          {matriculas.length === 0 ? (
            <EmptyState titulo="Ainda não pediu nenhuma aula" />
          ) : (
            <div className="space-y-2">
              {matriculas.map((m) => (
                <div key={m.id} className="lista-item">
                  <p className="lista-item-titulo">
                    {m.instrumentos?.nome} — {m.professor?.nome}
                  </p>
                  <p className="lista-item-sub">
                    {m.estado === 'a_escolher' && 'A aguardar confirmação do professor.'}
                    {m.estado === 'confirmado' && m.horarios && (
                      <>
                        {m.horarios.dia_semana}, {m.horarios.hora_inicio.slice(0, 5)}–
                        {m.horarios.hora_fim.slice(0, 5)}
                        {formatarSala(m.horarios.salas) && ` — ${formatarSala(m.horarios.salas)}`}
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section></aside><div>

        <section className="admin-ficha-seccao">
          <h2 className="secao-titulo">Presenças</h2>
          {presencas.length === 0 ? (
            <EmptyState
              titulo="Ainda não há presenças registadas"
              descricao="Aparecem aqui depois da primeira aula confirmada com o professor."
            />
          ) : (
            <div className="space-y-2">
              {presencas.map((p) => (
                <div key={p.id} className="lista-item flex items-center justify-between gap-3">
                  <div>
                    <p className="lista-item-titulo">{p.data}</p>
                    <p className="lista-item-sub">
                      {matriculaPorId.get(p.matricula_id)?.instrumentos?.nome}
                    </p>
                  </div>
                  <span className={`estado-pill estado-${p.estado}`}>
                    {ESTADO_PRESENCA_LABEL[p.estado] ?? p.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="admin-ficha-seccao">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="secao-titulo">Programa de Recomendação</h2>
            <Link
              href="/admin/recomendacoes/nova"
              className="rounded-[13px] border border-[var(--color-linha)] px-3 py-[6px] text-[13px] font-medium text-[var(--color-azul-fundo)]"
            >
              Registar recomendação
            </Link>
          </div>
          {beneficios.length === 0 ? (
            <EmptyState titulo="Este aluno ainda não recomendou ninguém" />
          ) : (
            <div className="space-y-2">
              {beneficios.map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/recomendacoes/${b.recomendacao_id}`}
                  className="lista-item flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="lista-item-titulo">
                      {ESTADO_BENEFICIO_LABEL[b.estado] ?? b.estado}
                    </p>
                    <p className="lista-item-sub">
                      {b.estado === 'usado' && b.ano_uso && b.mes_uso
                        ? `Aplicada em ${String(b.mes_uso).padStart(2, '0')}/${b.ano_uso}` +
                          (b.valor_coberto !== null ? ` — ${euros(b.valor_coberto)}` : '')
                        : b.motivo_anulacao ??
                          (b.estado === 'pendente'
                            ? 'Será aplicada no dia 1 do próximo mês.'
                            : 'Não chegou a ser usada.')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="admin-ficha-seccao">
          <h2 className="secao-titulo">Histórico de mensalidades</h2>
          {mensalidades.length === 0 ? (
            <EmptyState
              titulo="Ainda não há mensalidades registadas"
              descricao="Aparecem aqui assim que a primeira mensalidade for lançada."
            />
          ) : (
            <div className="space-y-2">
              {mensalidades.map((men) => {
                const estado = estadoDaMensalidade(men)
                return (
                  <div key={men.id} className="lista-item flex items-center justify-between gap-3">
                    <div>
                      <p className="lista-item-titulo">
                        {String(men.mes).padStart(2, '0')}/{men.ano}
                        {men.instrumento_nome && ` — ${men.instrumento_nome}`}
                      </p>
                      <p className="lista-item-sub">
                        {eurosOuTexto(men.valor, 'Sem valor a cobrar')}
                        {men.numero_fatura && ` — Fatura ${men.numero_fatura}`}
                      </p>
                    </div>
                    <span className={`estado-pill ${estado.classe}`}>{estado.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section></div></div>
      </div>
    </main>
  )
}
