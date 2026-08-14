import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { datasDoDia, INICIO_PRESENCAS, hojeISO } from '@/lib/datas'

type Horario = {
  id: number
  dia_semana: string
}

type MatriculaConfirmada = {
  id: number
  horario_final_id: number
}

export default async function PresencasPage() {
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
      supabase.from('horarios').select('id, dia_semana').eq('professor_id', user.id),
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
  let porConfirmar = 0
  for (const horario of horarios) {
    const idsAlunos = matriculaIdsPorHorario.get(horario.id) ?? []
    if (idsAlunos.length === 0) continue

    for (const data of datasDoDia(horario.dia_semana, INICIO_PRESENCAS, hoje)) {
      const marcadosNesseDia = idsAlunos.filter((id) => marcadas.has(`${id}|${data}`)).length
      if (marcadosNesseDia < idsAlunos.length) {
        porConfirmar += 1
      }
    }
  }

  return (
    <main id="conteudo-principal" className="partitura-pagina presencas-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href="/dashboard" className="partitura-voltar" aria-label="Voltar ao início">←</Link>
          <div><p className="partitura-sobretitulo">Livro de chamada</p><h1>Presenças</h1><p>{porConfirmar > 0 ? 'Há registos que precisam da tua atenção.' : 'Tudo confirmado até hoje.'}</p></div>
        </header>

        <section className={`presencas-estado ${porConfirmar === 0 ? 'presencas-estado-ok' : ''}`}>
          <span>{porConfirmar}</span>
          <div><strong>{porConfirmar === 1 ? 'aula por confirmar' : 'aulas por confirmar'}</strong><small>{porConfirmar > 0 ? 'Começa pela ocorrência mais antiga' : 'O livro de chamada está atualizado'}</small></div>
        </section>

        <nav className="presencas-destinos" aria-label="Ações de presenças">
          <Link href="/dashboard/presencas/confirmar"><span><b>01</b><strong>{porConfirmar > 0 ? 'Confirmar agora' : 'Consultar confirmações'}</strong></span><small>Registar presente ou falta por aula</small><i aria-hidden="true">→</i></Link>
          <Link href="/dashboard/presencas/historico"><span><b>02</b><strong>Histórico</strong></span><small>Consultar o percurso de cada aluno</small><i aria-hidden="true">→</i></Link>
        </nav>
      </div>
    </main>
  )
}
