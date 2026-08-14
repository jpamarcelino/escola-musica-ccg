import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatarHora } from '@/lib/horarios-grade'
import { formatarSala } from '@/lib/sala'
import { agoraNaEscola, datasDoDia, formatarDataEscolar, INICIO_PRESENCAS, hojeISO } from '@/lib/datas'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { GrupoLista, LinhaLista, TituloSeccao } from '@/components/lista'
import { MensagemInfo } from '@/components/mensagem'

type Horario = {
  id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  salas: { nome: string; piso: number | null; numero: number | null } | null
}

type MatriculaConfirmada = {
  id: number
  horario_final_id: number
}

type Pendente = {
  horarioId: number
  data: string
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  sala: string | null
  totalAlunos: number
  marcados: number
}

export default async function ConfirmarPresencasPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>
}) {
  const { guardado } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: horariosData }, { data: matriculasData }] =
    await Promise.all([
      supabase.from('perfis_escola').select('tipo').eq('id', user.id).single(),
      supabase
        .from('horarios')
        .select('id, dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero)')
        .eq('professor_id', user.id),
      supabase
        .from('matriculas')
        .select('id, horario_final_id')
        .eq('professor_id', user.id)
        .eq('estado', 'confirmado')
        .not('horario_final_id', 'is', null),
    ])

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const horarios = (horariosData ?? []) as unknown as Horario[]
  const matriculas = (matriculasData ?? []) as unknown as MatriculaConfirmada[]

  const matriculaIdsPorHorario = new Map<number, number[]>()
  for (const m of matriculas) {
    const lista = matriculaIdsPorHorario.get(m.horario_final_id) ?? []
    lista.push(m.id)
    matriculaIdsPorHorario.set(m.horario_final_id, lista)
  }

  const todasMatriculaIds = matriculas.map((m) => m.id)
  const { data: presencasData } =
    todasMatriculaIds.length > 0
      ? await supabase
          .from('presencas')
          .select('matricula_id, data')
          .in('matricula_id', todasMatriculaIds)
      : { data: [] }
  const marcadas = new Set(
    (presencasData ?? []).map((p) => `${p.matricula_id}|${p.data}`)
  )

  const hoje = hojeISO()
  const agora = agoraNaEscola()
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  const pendentes: Pendente[] = []
  for (const horario of horarios) {
    const idsAlunos = matriculaIdsPorHorario.get(horario.id) ?? []
    if (idsAlunos.length === 0) continue

    for (const data of datasDoDia(horario.dia_semana, INICIO_PRESENCAS, hoje)) {
      if (data === hoje && horario.hora_fim > horaAtual) continue
      const marcadosNesseDia = idsAlunos.filter((id) => marcadas.has(`${id}|${data}`)).length
      if (marcadosNesseDia < idsAlunos.length) {
        pendentes.push({
          horarioId: horario.id,
          data,
          dia_semana: horario.dia_semana,
          hora_inicio: horario.hora_inicio,
          hora_fim: horario.hora_fim,
          sala: formatarSala(horario.salas),
          totalAlunos: idsAlunos.length,
          marcados: marcadosNesseDia,
        })
      }
    }
  }
  pendentes.sort((a, b) => a.data.localeCompare(b.data) || a.hora_inicio.localeCompare(b.hora_inicio))
  const atrasadas = pendentes.filter((p) => p.data < hoje)
  const deHoje = pendentes.filter((p) => p.data === hoje)

  return (
    <main id="conteudo-principal" className="flex-1 flex justify-center p-6 pb-[104px]">
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader
          voltar="/dashboard/presencas"
          titulo="Confirmar presenças"
          subtitulo={pendentes.length > 0 ? <>Começa pelas aulas mais antigas.</> : <>Está tudo em dia.</>}
        />

        {guardado && <MensagemInfo>Presenças guardadas.</MensagemInfo>}

        {pendentes.length === 0 ? (
          <EmptyState
            titulo="Não há aulas por confirmar"
            descricao="Está tudo em dia."
          />
        ) : (
          <>
            {atrasadas.length > 0 && (
              <section>
                <TituloSeccao contagem={atrasadas.length}>Em atraso</TituloSeccao>
                <GrupoLista>
                  {atrasadas.map((p) => (
                    <LinhaLista
                      key={`${p.horarioId}|${p.data}`}
                      href={`/dashboard/presencas/${p.horarioId}?data=${p.data}`}
                      titulo={`${formatarDataEscolar(p.data)} · ${p.dia_semana}`}
                      contexto={`${formatarHora(p.hora_inicio)}–${formatarHora(p.hora_fim)}${p.sala ? ` · ${p.sala}` : ''}`}
                      direita={<span className="text-[12px] font-semibold text-[var(--color-error)]">{p.totalAlunos - p.marcados} em falta</span>}
                    />
                  ))}
                </GrupoLista>
              </section>
            )}
            {deHoje.length > 0 && (
              <section>
                <TituloSeccao contagem={deHoje.length}>Hoje</TituloSeccao>
                <GrupoLista>
                  {deHoje.map((p) => (
                    <LinhaLista
                      key={`${p.horarioId}|${p.data}`}
                      href={`/dashboard/presencas/${p.horarioId}?data=${p.data}`}
                      titulo={`${formatarHora(p.hora_inicio)}–${formatarHora(p.hora_fim)}`}
                      contexto={p.sala ?? `${p.totalAlunos} ${p.totalAlunos === 1 ? 'aluno' : 'alunos'}`}
                      direita={<span className="text-[12px] font-semibold">{p.totalAlunos - p.marcados} em falta</span>}
                    />
                  ))}
                </GrupoLista>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
