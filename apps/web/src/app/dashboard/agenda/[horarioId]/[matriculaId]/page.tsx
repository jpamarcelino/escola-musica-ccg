import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DIAS_SEMANA, calcularIdade, formatarHora, type DiaSemana } from '@ccg/core'
import { desmatricularAluno, proporHorario } from '@/lib/actions/professor'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { SubmitButton } from '@/components/submit-button'
import { classesCampo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo, MensagemNota } from '@/components/mensagem'

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
  searchParams,
}: {
  params: Promise<{ horarioId: string; matriculaId: string }>
  searchParams: Promise<{ erro?: string; proposta?: string }>
}) {
  const { horarioId, matriculaId } = await params
  const { erro, proposta } = await searchParams

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

  // As horas livres deste professor: as que estão abertas e onde não
  // está ninguém. Uma hora "aberta" com um aluno lá dentro existe —
  // o estado do horário e a matrícula são duas coisas — e propô-la seria
  // prometer o lugar de outra pessoa.
  const [{ data: livresData }, { data: ocupadosData }, { data: pendenteData }] = await Promise.all([
    supabase
      .from('horarios')
      .select('id, dia_semana, hora_inicio, hora_fim')
      .eq('professor_id', user.id)
      .eq('estado', 'aberto')
      .neq('id', Number(horarioId)),
    supabase
      .from('matriculas')
      .select('horario_final_id')
      .eq('professor_id', user.id)
      .eq('estado', 'confirmado')
      .not('horario_final_id', 'is', null),
    supabase
      .from('propostas_horario')
      .select('id, criado_em, horarios!propostas_horario_horario_novo_id_fkey(dia_semana, hora_inicio, hora_fim)')
      .eq('matricula_id', Number(matriculaId))
      .eq('estado', 'pendente')
      .maybeSingle(),
  ])

  const ocupados = new Set((ocupadosData ?? []).map((m) => m.horario_final_id))
  const livres = ((livresData ?? []) as {
    id: number
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
  }[])
    .filter((h) => !ocupados.has(h.id))
    .sort((a, b) =>
      a.dia_semana === b.dia_semana
        ? a.hora_inicio.localeCompare(b.hora_inicio)
        : DIAS_SEMANA.indexOf(a.dia_semana) - DIAS_SEMANA.indexOf(b.dia_semana)
    )

  const pendente = pendenteData as unknown as {
    id: number
    criado_em: string
    horarios: { dia_semana: DiaSemana; hora_inicio: string; hora_fim: string } | null
  } | null

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

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}
        {proposta && (
          <MensagemInfo>Proposta enviada. A família tem de a aceitar.</MensagemInfo>
        )}

        <section className="detalhe-aluno-ficha" aria-labelledby="horario-titulo">
          <header><p className="partitura-indice">02</p><h2 id="horario-titulo">Mudar de horário</h2></header>

          {pendente ? (
            /* Uma proposta por responder de cada vez. Enviar outra por
               cima seria pôr duas perguntas contraditórias na mesma
               caixa de entrada — a função na base de dados cancela a
               anterior, e este ecrã diz que é isso que vai acontecer. */
            <MensagemNota>
              Já propuseste{' '}
              <strong>
                {pendente.horarios?.dia_semana},{' '}
                {pendente.horarios && formatarHora(pendente.horarios.hora_inicio)}–
                {pendente.horarios && formatarHora(pendente.horarios.hora_fim)}
              </strong>
              . À espera da resposta da família. Escolher outro horário abaixo substitui esta
              proposta.
            </MensagemNota>
          ) : (
            <p className="text-sm text-foreground/70">
              O aluno recebe a proposta e decide. Enquanto não responder, a aula fica onde está e
              o horário novo continua livre para outra pessoa.
            </p>
          )}

          {livres.length === 0 ? (
            <p className="text-sm text-foreground/60">
              Não tens mais nenhum horário aberto e livre. Abre um em Horários primeiro.
            </p>
          ) : (
            <form action={proporHorario} className="space-y-3 pt-2">
              <input type="hidden" name="matriculaId" value={matricula.id} />
              <input type="hidden" name="horarioAtualId" value={horarioId} />

              <fieldset className="space-y-2">
                <legend className="text-[13px] font-medium">Horário a propor</legend>
                {livres.map((h) => (
                  <label key={h.id} className="lista-item flex items-center gap-[12px]">
                    <input
                      type="radio"
                      name="horarioId"
                      value={h.id}
                      required
                      className="h-[20px] w-[20px] shrink-0 accent-[var(--color-azul-fundo)]"
                    />
                    <span>
                      <span className="lista-item-titulo block">{h.dia_semana}</span>
                      <span className="lista-item-sub">
                        {formatarHora(h.hora_inicio)}–{formatarHora(h.hora_fim)}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="space-y-1">
                <label htmlFor="mensagem" className="block text-[13px] font-medium">
                  Mensagem <span className="text-foreground/50">(opcional)</span>
                </label>
                <textarea id="mensagem" name="mensagem" rows={2} maxLength={500} className={classesCampo} />
              </div>

              <SubmitButton
                textoAGuardar="A enviar…"
                className="flex h-[52px] items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-[var(--color-ink)] px-7 text-[15px] font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-raised)] disabled:opacity-50 motion-reduce:transition-none"
              >
                Propor este horário
              </SubmitButton>
            </form>
          )}
        </section>

        <section className="detalhe-zona-perigo">
          <div><strong>Remover desta aula</strong><small>A matrícula deixa de estar associada ao professor e horário.</small></div>
          <BotaoAcaoDestruir
            label="Desmatricular aluno"
            variante="editorial"
            // Ao professor interessa a consequência que é dele: o
            // horário não volta a abrir sozinho.
            mensagem={`Terminam as aulas de ${matricula.alunos?.nome} em ${matricula.instrumentos?.nome}.\n\nO horário fica bloqueado até o desbloqueares.`}
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
