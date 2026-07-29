import type { CSSProperties } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/back-button'
import { formatarSala } from '@/lib/sala'
import { calcularIdade } from '@/lib/idade'

type AlunoPerfil = {
  nome: string
  data_nascimento: string | null
  encarregado: { email: string | null; telefone: string | null } | null
}

type Matricula = {
  id: number
  estado: string
  professor: { nome: string } | null
  instrumentos: { nome: string } | null
  horarios: {
    dia_semana: string
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

type Presenca = {
  id: number
  data: string
  estado: string
  matricula_id: number
}

type Mensalidade = {
  id: number
  ano: number
  mes: number
  valor: number
  pago: boolean
  numero_fatura: string | null
  matricula_id: number
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
    .select('nome, data_nascimento, encarregado:profiles!alunos_encarregado_id_fkey(email, telefone)')
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

  const { data: mensalidadesData } =
    matriculaIds.length > 0
      ? await supabase
          .from('mensalidades')
          .select('id, ano, mes, valor, pago, numero_fatura, matricula_id')
          .in('matricula_id', matriculaIds)
          .order('ano', { ascending: false })
          .order('mes', { ascending: false })
      : { data: [] }
  const mensalidades = (mensalidadesData ?? []) as unknown as Mensalidade[]

  const matriculaPorId = new Map(matriculas.map((m) => [m.id, m]))
  const idade = calcularIdade(aluno.data_nascimento)

  return (
    <main className="flex-1 flex justify-center p-6">
      <div className="w-full max-w-2xl space-y-8 text-left">
        <div
          className="entrada-esquerda flex items-center gap-3"
          style={{ '--card-index': 0 } as CSSProperties}
        >
          <BackButton href="/admin/alunos" />
          <h1 className="text-2xl font-semibold text-foreground">{aluno.nome}</h1>
        </div>

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 1 } as CSSProperties}
        >
          <h2 className="secao-titulo">Encarregado de educação</h2>
          <div className="lista-item space-y-1">
            {aluno.encarregado?.email && (
              <p className="lista-item-sub">Email: {aluno.encarregado.email}</p>
            )}
            {aluno.encarregado?.telefone && (
              <p className="lista-item-sub">Telemóvel: {aluno.encarregado.telefone}</p>
            )}
            {idade !== null && <p className="lista-item-sub">Idade: {idade} anos</p>}
            {!aluno.encarregado?.email && !aluno.encarregado?.telefone && idade === null && (
              <p className="lista-item-sub">Sem informação adicional.</p>
            )}
          </div>
        </section>

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 2 } as CSSProperties}
        >
          <h2 className="secao-titulo">Horário e professor</h2>
          {matriculas.length === 0 ? (
            <p className="text-sm text-foreground/60">Ainda não pediu nenhuma aula.</p>
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
        </section>

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 3 } as CSSProperties}
        >
          <h2 className="secao-titulo">Presenças</h2>
          {presencas.length === 0 ? (
            <p className="text-sm text-foreground/60">Ainda não há presenças registadas.</p>
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

        <section
          className="entrada-esquerda space-y-3"
          style={{ '--card-index': 4 } as CSSProperties}
        >
          <h2 className="secao-titulo">Histórico de mensalidades</h2>
          {mensalidades.length === 0 ? (
            <p className="text-sm text-foreground/60">Ainda não há mensalidades registadas.</p>
          ) : (
            <div className="space-y-2">
              {mensalidades.map((men) => (
                <div key={men.id} className="lista-item flex items-center justify-between gap-3">
                  <div>
                    <p className="lista-item-titulo">
                      {String(men.mes).padStart(2, '0')}/{men.ano} —{' '}
                      {matriculaPorId.get(men.matricula_id)?.instrumentos?.nome}
                    </p>
                    <p className="lista-item-sub">
                      {men.valor.toFixed(2)}€
                      {men.numero_fatura && ` — Fatura ${men.numero_fatura}`}
                    </p>
                  </div>
                  <span
                    className={`estado-pill ${men.pago ? 'estado-presente' : 'estado-falta_sem_aviso'}`}
                  >
                    {men.pago ? 'Pago' : 'Por pagar'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
