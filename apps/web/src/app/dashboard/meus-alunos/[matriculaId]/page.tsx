import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DIAS_SEMANA, calcularIdade, formatarDataEscolar, formatarHora, type DiaSemana } from '@ccg/core'
import { desmatricularAluno, proporHorario } from '@/lib/actions/professor'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { SubmitButton } from '@/components/submit-button'
import { classesCampo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo, MensagemNota } from '@/components/mensagem'

type Matricula = {
  id: number
  aluno_id: string
  horario_final_id: number | null
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
  params: Promise<{ matriculaId: string }>
  searchParams: Promise<{ erro?: string; proposta?: string }>
}) {
  const { matriculaId } = await params
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
      'id, aluno_id, horario_final_id, instrumentos(nome), alunos(nome, data_nascimento, encarregado:profiles!alunos_encarregado_id_fkey(email, telefone))'
    )
    .eq('id', Number(matriculaId))
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .maybeSingle()
  const matricula = matriculaData as unknown as Matricula | null

  if (!matricula) {
    notFound()
  }

  const idade = calcularIdade(matricula.alunos?.data_nascimento)

  // O que este professor já deixou no caderno deste aluno. Só o dele: a
  // policy de 0048 limita a `professor_id = auth.uid()`, e um aluno com
  // dois professores tem dois históricos separados — cada um vê o seu.
  const { data: materiaisData } = await supabase
    .from('materiais_alunos')
    .select('materiais!inner(id, tipo, titulo, descricao, youtube_id, criado_em, professor_id)')
    .eq('aluno_id', matricula.aluno_id)

  const materiais = ((materiaisData ?? []) as unknown as {
    materiais: {
      id: number
      tipo: string
      titulo: string
      descricao: string | null
      youtube_id: string | null
      criado_em: string
      professor_id: string
    }
  }[])
    .map((l) => l.materiais)
    .filter((m) => m.professor_id === user.id)
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))

  const horarioId = matricula.horario_final_id

  const { data: horarioData } = await supabase
    .from('horarios')
    .select('dia_semana, hora_inicio, hora_fim')
    .eq('id', horarioId ?? 0)
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
      .neq('id', horarioId ?? 0),
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
          <Link href="/dashboard/meus-alunos" className="partitura-voltar" aria-label="Voltar aos alunos">←</Link>
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
              <input type="hidden" name="horarioAtualId" value={horarioId ?? ''} />

              {/* Fechado por omissão: um professor com vinte horas livres
                  tinha vinte linhas de rádio abertas por baixo da ficha,
                  e o que ele veio ver era o telemóvel do encarregado. A
                  seta abre quando for preciso. */}
              <details className="escolher-horario">
                <summary>
                  Escolher outro horário
                  <span className="escolher-horario-conta">
                    {livres.length} {livres.length === 1 ? 'livre' : 'livres'}
                  </span>
                </summary>
                <fieldset className="space-y-2">
                <legend className="sr-only">Horário a propor</legend>
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

              <div className="space-y-1 pt-3">
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
              </details>
            </form>
          )}
        </section>

        <section className="detalhe-aluno-ficha" aria-labelledby="materiais-titulo">
          <header><p className="partitura-indice">03</p><h2 id="materiais-titulo">Materiais enviados</h2></header>

          {materiais.length === 0 ? (
            <p className="detalhe-materiais-vazio">
              Ainda não enviaste material a {matricula.alunos?.nome.split(' ')[0]}.
            </p>
          ) : (
            <ul className="detalhe-materiais">
              {materiais.map((m) => (
                <li key={m.id}>
                  <span className="detalhe-material-tipo">
                    {m.tipo === 'partitura' ? 'Partitura' : 'Vídeo'}
                  </span>
                  <span>
                    <strong>{m.titulo}</strong>
                    {m.descricao && <small>{m.descricao}</small>}
                  </span>
                  <time dateTime={m.criado_em}>
                    {formatarDataEscolar(m.criado_em.slice(0, 10), {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}

          {/* Leva à ferramenta de envio com este aluno já escolhido — a
              pergunta "a quem?" já foi respondida por se estar na ficha
              dele. */}
          <Link
            href={`/dashboard/enviar-material?aluno=${matricula.aluno_id}`}
            className="detalhe-material-enviar"
          >
            Enviar material novo
          </Link>
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
            <input type="hidden" name="horarioId" value={horarioId ?? ''} />
          </BotaoAcaoDestruir>
        </section>
      </div>
    </main>
  )
}
