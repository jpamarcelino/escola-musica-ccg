import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, BookOpen, CalendarDays, Bell, Clock } from 'lucide-react'
import { getAuthContext } from '@/lib/auth-context'
import { agoraNaEscola, estadoTemporalAula, proximaOcorrenciaDeAula, formatarHora, formatarSala, type DiaSemana } from '@ccg/core'
import type { MatriculaEstado } from '@ccg/types'

type Matricula = {
  id: number
  estado: MatriculaEstado
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
  horarios: { dia_semana: DiaSemana; hora_inicio: string; hora_fim: string; salas: { nome: string; piso: number | null; numero: number | null } | null } | null
}

export default async function AlunoHubPage({
  params,
}: {
  params: Promise<{ alunoId: string }>
}) {
  const { alunoId } = await params

  const { supabase, user } = await getAuthContext()

  if (!user) {
    redirect('/login')
  }

  const { data: aluno } = await supabase
    .from('alunos')
    .select('nome')
    .eq('id', alunoId)
    .eq('encarregado_id', user.id)
    .maybeSingle()

  if (!aluno) {
    notFound()
  }

  const [{ count: notificacoesPorLer }, { data: matriculasData }] = await Promise.all([
    supabase.from('notificacoes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('lida', false),
    supabase.from('matriculas').select('id, estado, instrumentos(nome), profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))').eq('aluno_id', alunoId).in('estado', ['a_escolher', 'confirmado']),
  ])
  const agora = agoraNaEscola()
  const aulas = ((matriculasData ?? []) as unknown as Matricula[])
    .filter((m) => m.estado === 'confirmado' && m.horarios)
    .map((m) => ({ ...m, data: proximaOcorrenciaDeAula(m.horarios!.dia_semana, m.horarios!.hora_inicio, m.horarios!.hora_fim, agora) }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.horarios!.hora_inicio.localeCompare(b.horarios!.hora_inicio))
  const pendentes = ((matriculasData ?? []) as unknown as Matricula[]).filter((m) => m.estado === 'a_escolher').length
  const dataHoje = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).format(agora)

  return (
    <main id="conteudo-principal" className="pinterest-aluno">
      <div className="pinterest-aluno-folha">
        <header className="pinterest-aluno-cabecalho">
          <Link href="/dashboard" className="pinterest-aluno-voltar" aria-label="Voltar ao início">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
          <div>
            <h1>{aluno.nome}</h1>
            <p>{dataHoje}</p>
          </div>
          <Link href={`/aluno/${alunoId}/horario`}>Agenda</Link>
        </header>

        <section className="pinterest-aluno-seccao" aria-label={`Dia de ${aluno.nome}`}>
          <h2>Hoje</h2>
          {aulas.length === 0 ? (
            <div className="pinterest-aluno-vazio">
              <strong>Ainda não há aulas confirmadas.</strong>
              <p>Hoje respira. Quando houver uma inscrição a decorrer, as aulas aparecem aqui.</p>
              <Link href={`/aluno/${alunoId}/pedido`}>Começar um novo pedido</Link>
            </div>
          ) : (
            /* Deixaram de ser acordeões: abrir cada aula para ver a sala
               escondia justamente a informação que se veio buscar. Tudo
               fica à vista, e o cartão leva à agenda. */
            <div className="pinterest-aluno-aulas">
              {aulas.slice(0, 4).map((aula, indice) => {
                const horario = aula.horarios!
                const estado = estadoTemporalAula(
                  aula.data,
                  horario.hora_inicio,
                  horario.hora_fim,
                  agora
                )
                const destaque = estado === 'agora' || indice === 0
                const sala = formatarSala(horario.salas)
                return (
                  <Link
                    key={aula.id}
                    href={`/aluno/${alunoId}/horario`}
                    className="pinterest-aluno-aula"
                    data-destaque={destaque}
                  >
                    <time>{formatarHora(horario.hora_inicio)}</time>
                    <small>
                      {estado === 'agora' ? 'Agora' : indice === 0 ? 'A seguir' : horario.dia_semana}
                    </small>
                    <strong>{aula.instrumentos?.nome}</strong>
                    <span>
                      {aula.profiles?.nome}
                      {` · até às ${formatarHora(horario.hora_fim)}`}
                      {sala ? ` · ${sala}` : ''}
                    </span>
                    <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section className="pinterest-aluno-seccao" aria-label="Atalhos">
          <h2>Atalhos</h2>
          <div className="pinterest-aluno-atalhos">
            {/* "O teu caderno" tratava por tu o aluno, mas quem tem esta
                página aberta é o encarregado — a conta é dele. O nome do
                filho resolve a ambiguidade sem mudar o tom. */}
            <Link href={`/aluno/${alunoId}/materiais`}>
              <span>
                <BookOpen size={19} strokeWidth={2} aria-hidden="true" />
              </span>
              <strong>Caderno de {aluno.nome.split(' ')[0]}</strong>
              <small>Vídeos e partituras</small>
            </Link>
            <Link href={`/aluno/${alunoId}/horario`}>
              <span>
                <CalendarDays size={19} strokeWidth={2} aria-hidden="true" />
              </span>
              <strong>Horário</strong>
              <small>As aulas da semana</small>
            </Link>
            {(notificacoesPorLer ?? 0) > 0 && (
              <Link href="/dashboard/avisos">
                <span>
                  <Bell size={19} strokeWidth={2} aria-hidden="true" />
                </span>
                <strong>
                  {notificacoesPorLer}{' '}
                  {(notificacoesPorLer ?? 0) === 1 ? 'aviso por ler' : 'avisos por ler'}
                </strong>
                <small>Consultar avisos</small>
              </Link>
            )}
            {pendentes > 0 && (
              <Link href={`/aluno/${alunoId}/horario`}>
                <span>
                  <Clock size={19} strokeWidth={2} aria-hidden="true" />
                </span>
                <strong>
                  {pendentes} {pendentes === 1 ? 'pedido em curso' : 'pedidos em curso'}
                </strong>
                <small>À espera de horário</small>
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
