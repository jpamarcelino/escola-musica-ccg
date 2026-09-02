import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth-context'
import { datasDoDia, INICIO_PRESENCAS, hojeISO, type DiaSemana } from '@ccg/core'
import { CheckCircle2, ChevronRight, ClipboardCheck, History } from 'lucide-react'
import { VoltarAtras } from '@/components/voltar-atras'

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
    <main id="conteudo-principal" className="pinterest-presencas">
      <div className="pinterest-presencas-folha">
        <header className="pinterest-presencas-cabecalho">
          <VoltarAtras destino="/dashboard" className="pinterest-presencas-voltar" rotulo="Voltar ao início" tamanho={24} />
          <div><h1>Presenças</h1><p>{porConfirmar > 0 ? 'Há aulas que precisam da tua atenção.' : 'Tudo confirmado até hoje.'}</p></div>
        </header>

        {/* O número em destaque passa a ser ele próprio o caminho para a
            tarefa. Era texto estático: anunciava-se a urgência em corpo
            grande e vermelho e depois obrigava a procurar a ligação por
            baixo. Quando não há nada por confirmar não há para onde ir,
            por isso aí continua a ser só um aviso. */}
        {porConfirmar > 0 ? (
          <Link href="/dashboard/presencas/confirmar" className="presencas-estado presencas-estado-ligacao">
            <span><ClipboardCheck size={24} strokeWidth={1.9} aria-hidden="true" /></span>
            <div>
              <small>{porConfirmar === 1 ? '1 aula' : `${porConfirmar} aulas`}</small>
              <strong>Por confirmar</strong>
              <small>Começa pela ocorrência mais antiga</small>
            </div>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
        ) : (
          <section className="presencas-estado presencas-estado-ok">
            <span><CheckCircle2 size={25} strokeWidth={1.9} aria-hidden="true" /></span>
            <div><small>Nenhuma pendente</small><strong>Tudo em dia</strong><small>O livro de chamada está atualizado</small></div>
          </section>
        )}

        {/* Havia aqui um "Confirmar agora" que ia dar exatamente ao
            mesmo sítio que o cartão vermelho lá em cima — dois caminhos
            para a mesma tarefa, a dois centímetros um do outro, e a
            pergunta implícita de qual deles é o certo.
            
            Quando há aulas por confirmar, o caminho é o cartão: é maior,
            diz quantas são e está primeiro. Quando não há nada por
            confirmar, o cartão deixa de ser clicável — e é então que
            esta lista precisa de levar lá, para se poderem rever
            confirmações antigas. */}
        <nav className="presencas-destinos" aria-label="Ações de presenças">
          {porConfirmar === 0 && (
            <Link href="/dashboard/presencas/confirmar"><span><ClipboardCheck size={21} aria-hidden="true" /></span><span><strong>Consultar confirmações</strong><small>Rever presenças e faltas já registadas</small></span><ChevronRight size={19} aria-hidden="true" /></Link>
          )}
          <Link href="/dashboard/presencas/historico"><span><History size={21} aria-hidden="true" /></span><span><strong>Histórico</strong><small>Consultar o percurso de cada aluno</small></span><ChevronRight size={19} aria-hidden="true" /></Link>
        </nav>
      </div>
    </main>
  )
}
