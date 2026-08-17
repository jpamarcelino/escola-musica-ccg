import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getAuthContext } from '@/lib/auth-context'
import { agoraNaEscola, estadoTemporalAula, proximaOcorrenciaDeAula, formatarHora, formatarSala } from '@ccg/core'

type Matricula = {
  id: number
  estado: string
  instrumentos: { nome: string } | null
  profiles: { nome: string } | null
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string; salas: { nome: string; piso: number | null; numero: number | null } | null } | null
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
    <main id="conteudo-principal" className="aluno-vivo">
      <header className="aluno-vivo-cabecalho"><Link href="/dashboard" aria-label="Voltar ao início">←</Link><div><p>{dataHoje}</p><h1>{aluno.nome}</h1></div><Link href={`/aluno/${alunoId}/horario`}>Agenda completa</Link></header>
      <section className="aluno-vivo-dia" aria-label={`Dia de ${aluno.nome}`}>
        <div className="aluno-vivo-eixo" aria-hidden="true" />
        {aulas.length === 0 ? (
          <div className="aluno-vivo-vazio"><p>Hoje respira.</p><h2>Ainda não há aulas confirmadas.</h2><Link href={`/aluno/${alunoId}/pedido`}>Começar um novo pedido</Link></div>
        ) : aulas.slice(0, 4).map((aula, indice) => {
          const horario = aula.horarios!
          const estado = estadoTemporalAula(aula.data, horario.hora_inicio, horario.hora_fim, agora)
          const destaque = estado === 'agora' || indice === 0
          return <details key={aula.id} className="aluno-vivo-aula" data-estado={estado} data-destaque={destaque} open={estado === 'agora'}>
            <summary><time>{formatarHora(horario.hora_inicio)}</time><span className="aluno-vivo-ponto" aria-hidden="true"/><span><small>{estado === 'agora' ? 'Agora' : indice === 0 ? 'A seguir' : horario.dia_semana}</small><strong>{aula.instrumentos?.nome}</strong><b>{aula.profiles?.nome}</b></span><i aria-hidden="true">＋</i></summary>
            <div><p>{formatarHora(horario.hora_inicio)}–{formatarHora(horario.hora_fim)}{formatarSala(horario.salas) ? ` · ${formatarSala(horario.salas)}` : ''}</p><nav><Link href={`/aluno/${alunoId}/materiais`}>Abrir materiais</Link><Link href={`/aluno/${alunoId}/horario`}>Ver na agenda</Link></nav></div>
          </details>
        })}
      </section>
      <aside className="aluno-vivo-atencao" aria-label="Precisa de atenção">
        {(notificacoesPorLer ?? 0) > 0 && <Link href="/dashboard/avisos"><small>Novo</small><strong>{notificacoesPorLer} {(notificacoesPorLer ?? 0) === 1 ? 'aviso por ler' : 'avisos por ler'}</strong><span>Consultar avisos</span></Link>}
        {pendentes > 0 && <Link href={`/aluno/${alunoId}/horario`}><small>Em curso</small><strong>{pendentes} {pendentes === 1 ? 'pedido aguarda horário' : 'pedidos aguardam horário'}</strong><span>Acompanhar pedido</span></Link>}
        {/* "O teu caderno" tratava por tu o aluno, mas quem tem esta
            página aberta é o encarregado — a conta é dele. O nome do
            filho resolve a ambiguidade sem mudar o tom. */}
        <Link href={`/aluno/${alunoId}/materiais`}><small>Prática</small><strong>O caderno de {aluno.nome.split(' ')[0]}</strong><span>Abrir materiais</span></Link>
      </aside>
    </main>
  )
}
