import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/empty-state'
import { AdminAlunosDirectory, type AlunoDiretorio } from '@/components/admin-alunos-directory'
import type { DiaSemana } from '@ccg/core'

export default async function AdminAlunosPage() {
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

  const { data: alunosData } = await supabase
    .from('alunos')
    .select('id, nome, data_nascimento, encarregado:profiles!alunos_encarregado_id_fkey(email, telefone), matriculas(estado, cancelada_em, instrumentos(nome), professor:profiles!matriculas_professor_id_fkey(nome), horarios(dia_semana, hora_inicio, hora_fim))')
    .order('nome')
  const alunos = (alunosData ?? []) as unknown as {
    id: string; nome: string; data_nascimento: string | null; encarregado: { email: string | null; telefone: string | null } | null
    matriculas: { estado: string; cancelada_em: string | null; instrumentos: { nome: string } | null; professor: { nome: string } | null; horarios: { dia_semana: DiaSemana; hora_inicio: string; hora_fim: string } | null }[]
  }[]
  const diretorio: AlunoDiretorio[] = alunos.map((aluno) => ({ id: aluno.id, nome: aluno.nome, dataNascimento: aluno.data_nascimento, email: aluno.encarregado?.email ?? null, telefone: aluno.encarregado?.telefone ?? null, matriculas: aluno.matriculas.map((m) => ({ estado: m.estado, canceladaEm: m.cancelada_em, instrumento: m.instrumentos?.nome ?? null, professor: m.professor?.nome ?? null, horario: m.horarios ? `${m.horarios.dia_semana}, ${m.horarios.hora_inicio.slice(0, 5)}–${m.horarios.hora_fim.slice(0, 5)}` : null })) }))

  return (
    <main id="conteudo-principal" className="admin-mesa-pagina">
      <header className="admin-mesa-titulo"><div><p>Secretaria · Diretório</p><h1>Alunos</h1></div><span>Seleciona um nome para consultar sem perder a lista.</span></header>
        {alunos.length === 0 ? (
          <EmptyState
            titulo="Ainda não há alunos registados"
            descricao="Os alunos aparecem aqui assim que alguém pede uma aula ou cria conta em pedir-aula."
          />
        ) : (
          <AdminAlunosDirectory alunos={diretorio} />
        )}
    </main>
  )
}
