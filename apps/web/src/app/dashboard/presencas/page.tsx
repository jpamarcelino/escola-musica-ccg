import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth-context'
import { datasDoDia, INICIO_PRESENCAS, hojeISO, type DiaSemana } from '@ccg/core'

type Horario = {
  id: number
  dia_semana: DiaSemana
}

type MatriculaConfirmada = {
  id: number
  horario_final_id: number
}

export default async function PresencasPage() {
  const { supabase, user } = await getAuthContext()

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

        {/* O número em destaque passa a ser ele próprio o caminho para a
            tarefa. Era texto estático: anunciava-se a urgência em corpo
            grande e vermelho e depois obrigava a procurar a ligação por
            baixo. Quando não há nada por confirmar não há para onde ir,
            por isso aí continua a ser só um aviso. */}
        {porConfirmar > 0 ? (
          <Link href="/dashboard/presencas/confirmar" className="presencas-estado presencas-estado-ligacao">
            <span>{porConfirmar}</span>
            <div>
              <strong>{porConfirmar === 1 ? 'aula por confirmar' : 'aulas por confirmar'}</strong>
              <small>Começa pela ocorrência mais antiga</small>
            </div>
            <i aria-hidden="true">→</i>
          </Link>
        ) : (
          <section className="presencas-estado presencas-estado-ok">
            <span>{porConfirmar}</span>
            <div><strong>aulas por confirmar</strong><small>O livro de chamada está atualizado</small></div>
          </section>
        )}

        <nav className="presencas-destinos" aria-label="Ações de presenças">
          <Link href="/dashboard/presencas/confirmar"><span><b>01</b><strong>{porConfirmar > 0 ? 'Confirmar agora' : 'Consultar confirmações'}</strong></span><small>Registar presente ou falta por aula</small><i aria-hidden="true">→</i></Link>
          <Link href="/dashboard/presencas/historico"><span><b>02</b><strong>Histórico</strong></span><small>Consultar o percurso de cada aluno</small><i aria-hidden="true">→</i></Link>
        </nav>
      </div>
    </main>
  )
}
