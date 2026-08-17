import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calcularIdade, formatarHora } from '@ccg/core'
import { desmatricularAluno } from '@/lib/actions/professor'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'

type Matricula = {
  id: number
  instrumentos: { nome: string } | null
  alunos: {
    nome: string
    data_nascimento: string | null
    encarregado: { email: string | null; telefone: string | null } | null
  } | null
}

export default async function AlunoDaAulaPage({
  params,
}: {
  params: Promise<{ horarioId: string; matriculaId: string }>
}) {
  const { horarioId, matriculaId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('perfis_escola')
    .select('tipo')
    .eq('id', user.id)
    .single()

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: matriculaData } = await supabase
    .from('matriculas')
    .select(
      'id, instrumentos(nome), alunos(nome, data_nascimento, encarregado:profiles!alunos_encarregado_id_fkey(email, telefone))'
    )
    .eq('id', Number(matriculaId))
    .eq('horario_final_id', Number(horarioId))
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .maybeSingle()
  const matricula = matriculaData as unknown as Matricula | null

  if (!matricula) {
    notFound()
  }

  const idade = calcularIdade(matricula.alunos?.data_nascimento)

  const { data: horarioData } = await supabase
    .from('horarios')
    .select('dia_semana, hora_inicio, hora_fim')
    .eq('id', Number(horarioId))
    .maybeSingle()
  const labelHorario = horarioData
    ? `${horarioData.dia_semana}, ${formatarHora(horarioData.hora_inicio)}–${formatarHora(horarioData.hora_fim)}`
    : 'Horário'

  return (
    <main id="conteudo-principal" className="partitura-pagina detalhe-aluno-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <Link href={`/dashboard/agenda/${horarioId}`} className="partitura-voltar" aria-label="Voltar à aula">←</Link>
          <div><p className="partitura-sobretitulo">{labelHorario}</p><h1>{matricula.alunos?.nome}</h1><p>{matricula.instrumentos?.nome}</p></div>
        </header>

        <section className="detalhe-aluno-ficha" aria-labelledby="ficha-titulo">
          <header><p className="partitura-indice">01</p><h2 id="ficha-titulo">Ficha do aluno</h2></header>
          <dl>
          <div><dt>Disciplina</dt><dd>{matricula.instrumentos?.nome}</dd></div>
          {idade !== null && (
            <div><dt>Idade</dt><dd>{idade} anos</dd></div>
          )}
          {matricula.alunos?.encarregado?.email && (
            <div><dt>Email do encarregado</dt><dd><a href={`mailto:${matricula.alunos.encarregado.email}`}>{matricula.alunos.encarregado.email}</a></dd></div>
          )}
          {matricula.alunos?.encarregado?.telefone && (
            <div><dt>Telemóvel do encarregado</dt><dd><a href={`tel:${matricula.alunos.encarregado.telefone}`}>{matricula.alunos.encarregado.telefone}</a></dd></div>
          )}
          </dl>
        </section>

        <section className="detalhe-zona-perigo">
          <div><strong>Remover desta aula</strong><small>A matrícula deixa de estar associada ao professor e horário.</small></div>
          <BotaoAcaoDestruir
            label="Desmatricular aluno"
            variante="editorial"
            mensagem={`Tens a certeza que queres desmatricular ${matricula.alunos?.nome} (${matricula.instrumentos?.nome})? Esta ação é irreversível.`}
            action={desmatricularAluno}
          >
            <input type="hidden" name="matriculaId" value={matricula.id} />
            <input type="hidden" name="horarioId" value={horarioId} />
          </BotaoAcaoDestruir>
        </section>
      </div>
    </main>
  )
}
