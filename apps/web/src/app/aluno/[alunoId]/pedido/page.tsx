import type { CSSProperties } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { escolherDisponibilidades } from '@/lib/actions/aluno'
import { DIAS_SEMANA, calcularIdade, MUSICA_IDADE_MIN, MUSICA_IDADE_MAX, separarFaixaEtaria, parseFaixaEtaria, dentroDaFaixa, elegivelParaDisciplina, HOUR_HEIGHT, paraMinutos, formatarHora } from '@ccg/core'
import { CartaoLink } from '@/components/cartao-link'
import { Wizard, ListaEscolhas } from '@/components/wizard'
import { BotaoPrimario } from '@/components/botao-primario'
import { CampoTextarea } from '@/components/campo-formulario'
import { CampoRecomendacao } from '@/components/campo-recomendacao'
import { MensagemErro } from '@/components/mensagem'

// Nomes das escolas para as etiquetas de "escolhas até agora". Este
// percurso tem quatro passos e não cinco como o público: a idade não é
// perguntada, vem da ficha do filho.
const NOME_ESCOLA: Record<string, string> = {
  musica: 'Música',
  danca: 'Dança',
  bebes: 'Música para Bebés',
}


// Dias mostrados na grelha, da esquerda para a direita. Sem Domingo — a
// escola não funciona nesse dia.
const DIAS_GRADE = DIAS_SEMANA.slice(0, 6)

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ alunoId: string }>
  searchParams: Promise<{
    programa?: string
    instrumento?: string
    professor?: string
    erro?: string
  }>
}) {
  const { alunoId } = await params
  const { programa, instrumento, professor, erro } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: aluno } = await supabase
    .from('alunos')
    .select('nome, data_nascimento')
    .eq('id', alunoId)
    .eq('encarregado_id', user.id)
    .maybeSingle()

  if (!aluno) {
    notFound()
  }

  const idadeAluno = calcularIdade(aluno.data_nascimento)

  // Passo 1: escolher escola — as mesmas três da página inicial, com os
  // mesmos nomes e cores. Faltava aqui a Música para Bebés: quem já tinha
  // conta e pedia a partir do perfil do filho não tinha por onde lá chegar,
  // apesar de a escola existir e ter turmas.
  if (programa !== 'musica' && programa !== 'danca' && programa !== 'bebes') {
    return (
      <Wizard voltar={`/aluno/${alunoId}`} passo={1} totalPassos={4}>
        <ListaEscolhas>
          <CartaoLink
            href={`/aluno/${alunoId}/pedido?programa=musica`}
            nome="Escola de Música"
            cor="var(--color-azul-logo)"
          />
          <CartaoLink
            href={`/aluno/${alunoId}/pedido?programa=danca`}
            nome="Escola de Dança"
            cor="var(--color-dourado)"
          />
          <CartaoLink
            href={`/aluno/${alunoId}/pedido?programa=bebes`}
            nome="Música para Bebés"
            cor="var(--color-verde)"
            novidade
          />
        </ListaEscolhas>
      </Wizard>
    )
  }

  // Passo 2: escolher disciplina
  if (!instrumento) {
    const { data: instrumentos } = await supabase
      .from('instrumentos')
      .select('id, nome, imagem_url')
      .eq('programa', programa)
      .order('nome')

    // As disciplinas dentro da idade do aluno aparecem primeiro, com o
    // estilo normal; as restantes ficam por baixo, a preto e branco e sem
    // poderem ser escolhidas. Sem data de nascimento, nada fica bloqueado.
    const itens = (instrumentos ?? []).map((i) => {
      if (programa === 'danca') {
        const { titulo, idade } = separarFaixaEtaria(i.nome)
        return {
          ...i,
          titulo,
          idade,
          elegivel: dentroDaFaixa(idadeAluno, parseFaixaEtaria(idade)),
        }
      }
      // Nas turmas de bebés o nome é só a faixa etária ("0 aos 3 anos"),
      // por isso a idade lê-se do próprio nome — sem título a separar.
      if (programa === 'bebes') {
        return {
          ...i,
          titulo: i.nome,
          idade: undefined as string | undefined,
          elegivel: dentroDaFaixa(idadeAluno, parseFaixaEtaria(i.nome)),
        }
      }
      return {
        ...i,
        titulo: i.nome,
        idade: undefined as string | undefined,
        elegivel: dentroDaFaixa(idadeAluno, {
          min: MUSICA_IDADE_MIN,
          max: MUSICA_IDADE_MAX,
        }),
      }
    })
    const ordenados = [
      ...itens.filter((i) => i.elegivel),
      ...itens.filter((i) => !i.elegivel),
    ]

    return (
      <Wizard
        title={
          programa === 'musica'
            ? 'Que instrumento queres aprender?'
            : programa === 'bebes'
              ? 'Escolha a turma indicada'
              : 'Que modalidade queres aprender?'
        }
        voltar={`/aluno/${alunoId}/pedido`}
        passo={2}
        totalPassos={4}
        escolhas={[
          { valor: aluno.nome.split(' ')[0] },
          { valor: NOME_ESCOLA[programa] ?? programa, href: `/aluno/${alunoId}/pedido` },
        ]}
      >
        <ListaEscolhas>
          {ordenados.map((i) => (
            <CartaoLink
              key={i.id}
              href={`/aluno/${alunoId}/pedido?programa=${programa}&instrumento=${i.id}`}
              nome={programa === 'danca' ? i.titulo : i.nome}
              descricao={i.idade ?? undefined}
              icone={i.imagem_url ?? undefined}
              iconeTamanho={34}
              bloqueado={!i.elegivel}
            />
          ))}
        </ListaEscolhas>
      </Wizard>
    )
  }

  const { data: instrumentoAtual } = await supabase
    .from('instrumentos')
    .select('nome')
    .eq('id', instrumento)
    .single()

  // Reforça aqui o mesmo bloqueio do Passo 2 — protege quem chega
  // diretamente a este link (ex: partilhado, ou o "Voltar" do browser)
  // sem passar pela grelha de cartões, onde a disciplina já estaria
  // desativada. A ação que cria mesmo o pedido (escolherDisponibilidades)
  // repete esta verificação no servidor, que é o que impede de facto.
  if (
    instrumentoAtual &&
    !elegivelParaDisciplina(idadeAluno, programa, instrumentoAtual.nome)
  ) {
    return (
      <Wizard
        title="Não disponível para esta idade"
        voltar={`/aluno/${alunoId}/pedido?programa=${programa}`}
      >
        <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--color-tinta-suave)' }}>
          Esta disciplina não está disponível para a idade do aluno.
        </p>
      </Wizard>
    )
  }

  const { data: matriculaExistente } = await supabase
    .from('matriculas')
    .select('id, estado')
    .eq('aluno_id', alunoId)
    .eq('instrumento_id', instrumento)
    .in('estado', ['a_escolher', 'confirmado'])
    .maybeSingle()

  if (matriculaExistente) {
    return (
      <Wizard
        title="Já existe um pedido nesta disciplina"
        voltar={`/aluno/${alunoId}/pedido?programa=${programa}`}
      >
        <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--color-tinta-suave)' }}>
          {matriculaExistente.estado === 'confirmado'
            ? 'Já existe uma aula confirmada nesta disciplina.'
            : 'Já existe um pedido pendente nesta disciplina.'}{' '}
          Cancela-o no dashboard antes de pedir outro professor para a mesma
          disciplina. Podes pedir outra disciplina à vontade.
        </p>
      </Wizard>
    )
  }

  // Passo 2: escolher professor
  if (!professor) {
    const { data: professoresData } = await supabase
      .from('professor_instrumentos')
      .select('professor_id, especialidade, profiles(nome, foto_url)')
      .eq('instrumento_id', instrumento)

    const professores = (
      (professoresData ?? []) as unknown as {
        professor_id: string
        especialidade: string | null
        profiles: { nome: string; foto_url: string | null } | null
      }[]
    ).sort((a, b) =>
      (a.profiles?.nome ?? '').localeCompare(b.profiles?.nome ?? '', 'pt')
    )

    return (
      <Wizard
        title="Escolhe o professor"
        voltar={`/aluno/${alunoId}/pedido?programa=${programa}`}
        passo={3}
        totalPassos={4}
        escolhas={[
          { valor: aluno.nome.split(' ')[0] },
          { valor: NOME_ESCOLA[programa] ?? programa, href: `/aluno/${alunoId}/pedido` },
        ]}
      >
        {professores.length ? (
          <ListaEscolhas>
            {professores.map((p) => (
              <CartaoLink
                key={p.professor_id}
                href={`/aluno/${alunoId}/pedido?programa=${programa}&instrumento=${instrumento}&professor=${p.professor_id}`}
                nome={p.profiles?.nome ?? ''}
                descricao={p.especialidade ?? undefined}
                icone={p.profiles?.foto_url ?? undefined}
                iconeTamanho={46}
                iconeCobre
                infoHref={`/professor/${p.professor_id}?voltar=${encodeURIComponent(
                  `/aluno/${alunoId}/pedido?programa=${programa}&instrumento=${instrumento}`
                )}`}
                infoRotulo={`Conhecer ${p.profiles?.nome ?? 'o professor'}`}
              />
            ))}
          </ListaEscolhas>
        ) : (
          <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--color-tinta-suave)' }}>
            Ainda não há professores para esta disciplina.
          </p>
        )}
      </Wizard>
    )
  }

  // Passo 3: escolher horários
  // Traz também os bloqueados (não só os "aberto") — continuam visíveis na
  // grelha, a preto e branco e sem poder ser escolhidos, para se ver o
  // horário completo do professor.
  // Aqui há sessão, por isso a adesão ao Programa lê-se direta de
  // perfis_escola — ao contrário do wizard público, que passa pela função
  // `professores_publicos` por não ter sessão nenhuma.
  const [{ data: horarios }, { data: professorPerfil }] = await Promise.all([
    supabase
      .from('horarios')
      .select('id, dia_semana, hora_inicio, hora_fim, estado')
      .eq('professor_id', professor),
    supabase
      .from('perfis_escola')
      .select('adere_recomendacao')
      .eq('id', professor)
      .eq('tipo', 'professor')
      .maybeSingle(),
  ])

  const horariosGrade = (horarios ?? []).filter((h) =>
    DIAS_GRADE.includes(h.dia_semana)
  )
  const semHorarios = horariosGrade.length === 0

  // A grelha só mostra as horas entre a aula mais cedo e a mais tarde deste
  // professor (arredondadas à hora certa), não um intervalo fixo do dia.
  const horaInicioGrade = semHorarios
    ? 0
    : Math.floor(
        Math.min(...horariosGrade.map((h) => paraMinutos(h.hora_inicio))) / 60
      )
  const horaFimGrade = semHorarios
    ? 0
    : Math.ceil(
        Math.max(...horariosGrade.map((h) => paraMinutos(h.hora_fim))) / 60
      )
  const horas = Array.from(
    { length: horaFimGrade - horaInicioGrade },
    (_, i) => horaInicioGrade + i
  )
  const alturaGrade = horas.length * HOUR_HEIGHT

  const horariosPorDia = new Map<string, typeof horariosGrade>()
  for (const dia of DIAS_GRADE) horariosPorDia.set(dia, [])
  for (const h of horariosGrade) horariosPorDia.get(h.dia_semana)?.push(h)
  for (const dia of DIAS_GRADE) {
    horariosPorDia.get(dia)?.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }

  // Ordem para a entrada animada dos cartões (dia a dia, de cima para
  // baixo em cada coluna) — a mesma cascata usada nos cartões de opção.
  const indicePorHorario = new Map<number, number>()
  let indiceAtual = 0
  for (const dia of DIAS_GRADE) {
    for (const h of horariosPorDia.get(dia) ?? []) {
      indicePorHorario.set(h.id, indiceAtual)
      indiceAtual += 1
    }
  }

  return (
    <Wizard
      title="Seleciona os vários horários em que há disponibilidade"
      voltar={`/aluno/${alunoId}/pedido?programa=${programa}&instrumento=${instrumento}`}
      passo={4}
      totalPassos={4}
      escolhas={[
        { valor: aluno.nome.split(' ')[0] },
        { valor: NOME_ESCOLA[programa] ?? programa, href: `/aluno/${alunoId}/pedido` },
      ]}
    >
      <form action={escolherDisponibilidades} className="space-y-4">
        <input type="hidden" name="alunoId" value={alunoId} />
        <input type="hidden" name="instrumentoId" value={instrumento} />
        <input type="hidden" name="professorId" value={professor} />
        {semHorarios ? (
          <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--color-tinta-suave)' }}>
            Este professor ainda não tem horários disponíveis. Podes deixar-lhe
            uma mensagem em baixo.
          </p>
        ) : (
          <>
            <p className="text-[12.5px] leading-[1.5]" style={{ color: 'var(--color-tinta-suave)' }}>
              Podes escolher várias opções — o professor decide depois qual
              fica confirmada.
            </p>
            <div className="horarios-grade">
              <div className="horarios-coluna-horas">
                <div className="horarios-coluna-horas-cabecalho" />
                {horas.map((hora) => (
                  <div
                    key={hora}
                    className="horarios-hora-label"
                    style={{ height: HOUR_HEIGHT }}
                  >
                    {hora}h
                  </div>
                ))}
              </div>
              {DIAS_GRADE.map((dia) => (
                <div key={dia} className="horarios-coluna-dia">
                  <div className="horarios-coluna-dia-cabecalho">
                    {dia.slice(0, 3)}
                  </div>
                  <div
                    className="horarios-coluna-dia-corpo"
                    style={{
                      height: alturaGrade,
                      backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
                    }}
                  >
                    {horariosPorDia.get(dia)?.map((h) => {
                      const inicioMin = paraMinutos(h.hora_inicio)
                      const fimMin = paraMinutos(h.hora_fim)
                      const estilo = {
                        top: ((inicioMin - horaInicioGrade * 60) / 60) * HOUR_HEIGHT,
                        height: ((fimMin - inicioMin) / 60) * HOUR_HEIGHT,
                        '--card-index': indicePorHorario.get(h.id) ?? 0,
                      } as CSSProperties

                      if (h.estado === 'bloqueado') {
                        return (
                          <div
                            key={h.id}
                            className="horario-bloco entrada-esquerda bloqueado"
                            style={estilo}
                            aria-disabled="true"
                          >
                            <span>{formatarHora(h.hora_inicio)}</span>
                            <span>{formatarHora(h.hora_fim)}</span>
                          </div>
                        )
                      }

                      return (
                        <label
                          key={h.id}
                          className="horario-bloco entrada-esquerda"
                          style={estilo}
                        >
                          <input type="checkbox" name="horarios" value={h.id} />
                          <span>{formatarHora(h.hora_inicio)}</span>
                          <span>{formatarHora(h.hora_fim)}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <CampoTextarea
          id="mensagem"
          name="mensagem"
          label="Nenhum horário dá jeito?"
          rows={3}
          maxLength={500}
          placeholder="Ex: só posso às quintas-feiras a partir das 16h — achas que dá para arranjar?"
          ajuda="Deixa uma mensagem ao professor em vez de escolher um horário. Ele decide se quer entrar em contacto fora da app."
        />

        {professorPerfil?.adere_recomendacao && <CampoRecomendacao />}

        {erro && <MensagemErro>{erro}</MensagemErro>}
        <BotaoPrimario>Enviar pedido</BotaoPrimario>
      </form>
    </Wizard>
  )
}

