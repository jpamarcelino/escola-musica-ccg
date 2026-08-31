import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DIAS_SEMANA, MUSICA_IDADE_MIN, MUSICA_IDADE_MAX, separarFaixaEtaria, parseFaixaEtaria, dentroDaFaixa, elegivelParaDisciplina } from '@ccg/core'
import { WizardVitrine } from '@/components/wizard-vitrine'
import { SeletorIdade } from '@/components/seletor-idade'
import type { ProfessorParaRecomendacao } from '@/components/campo-recomendacao'
import { FormularioPedido } from './formulario-pedido'

// Nomes das escolas pelas palavras de quem escolhe, para as etiquetas
// de "escolhas até agora" no cabeçalho do assistente.
const NOME_ESCOLA: Record<string, string> = {
  musica: 'Música',
  danca: 'Dança',
  bebes: 'Música para Bebés',
}


// Dias mostrados na grelha, da esquerda para a direita. Sem Domingo — a
// escola não funciona nesse dia.
const DIAS_GRADE = DIAS_SEMANA.slice(0, 6)

// Versão pública do wizard de pedido (src/app/aluno/[alunoId]/pedido/page.tsx)
// — navegável sem conta. Só ao "Enviar pedido" é que se pede para entrar ou
// criar Conta CCG (ver formulario-pedido.tsx). Sem alunoId no caminho: a
// idade serve só para filtrar as disciplinas mostradas, o aluno real só é
// escolhido/criado nesse último passo.
export default async function PedirAulaPage({
  searchParams,
}: {
  searchParams: Promise<{
    programa?: string
    idade?: string
    instrumento?: string
    professor?: string
    erro?: string
  }>
}) {
  const { programa, idade, instrumento, professor, erro } = await searchParams
  const idadeNum = idade !== undefined && /^\d+$/.test(idade) ? Number(idade) : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // A escola escolhe-se na página inicial, que é por onde se entra aqui.
  // Sem ela não há wizard: em vez de mostrar um passo de escolha à parte
  // (que era o ecrã antigo, e para onde os "voltar" acabavam a cair),
  // devolve-se a pessoa à inicial.
  if (programa !== 'musica' && programa !== 'danca' && programa !== 'bebes') {
    redirect('/')
  }

  // Passo 1: idade do futuro aluno, já com a escola escolhida — só filtra
  // os cartões seguintes. Só aparece à entrada: o SeletorIdade substitui a
  // entrada no histórico em vez de acrescentar uma, para que voltar atrás
  // leve à página inicial e não outra vez ao pop-up.
  if (idadeNum === null) {
    return (
      <WizardVitrine
        voltar="/"
        passo={2}
        titulo="Que idade tem o futuro aluno?"
        entrada="Só para te mostrarmos as disciplinas certas para essa idade."
      >
        <SeletorIdade />
      </WizardVitrine>
    )
  }

  // Passo 3: escolher disciplina
  if (!instrumento) {
    const { data: instrumentos } = await supabase
      .from('instrumentos')
      .select('id, nome, imagem_url')
      .eq('programa', programa)
      .order('nome')

    const itens = (instrumentos ?? []).map((i) => {
      if (programa === 'danca') {
        const { titulo, idade: faixa } = separarFaixaEtaria(i.nome)
        return {
          ...i,
          titulo,
          idade: faixa,
          faixa: parseFaixaEtaria(faixa),
          elegivel: dentroDaFaixa(idadeNum, parseFaixaEtaria(faixa)),
        }
      }
      if (programa === 'bebes') {
        return {
          ...i,
          titulo: i.nome,
          idade: undefined as string | undefined,
          faixa: parseFaixaEtaria(i.nome),
          elegivel: dentroDaFaixa(idadeNum, parseFaixaEtaria(i.nome)),
        }
      }
      return {
        ...i,
        titulo: i.nome,
        idade: undefined as string | undefined,
        faixa: { min: MUSICA_IDADE_MIN, max: MUSICA_IDADE_MAX },
        elegivel: dentroDaFaixa(idadeNum, { min: MUSICA_IDADE_MIN, max: MUSICA_IDADE_MAX }),
      }
    })
    const ordenados = [
      ...itens.filter((i) => i.elegivel),
      ...itens.filter((i) => !i.elegivel),
    ]

    // Quando nada serve, a lista fica uma parede de cinzento sem uma
    // palavra a dizer porquê. As disciplinas de Dança trazem a faixa no
    // próprio nome ("4 aos 12 anos"), mas os instrumentos não trazem
    // nada — e é justamente aí que a idade costuma ficar de fora, por
    // ser abaixo do mínimo. Esta nota diz o limite e, quando existe,
    // aponta a escola onde essa idade cabe.
    const sugestao = itens.length > 0 && !itens.some((i) => i.elegivel)
      ? construirSugestao(
          programa,
          idadeNum,
          // Uma disciplina cujo nome não traga faixa não tem limite que
          // se cite, e por isso não entra no cálculo do mínimo/máximo.
          itens
            .map((i) => i.faixa)
            .filter((f): f is { min: number; max: number } => f !== null)
        )
      : null

    return (
      <WizardVitrine
        voltar="/"
        passo={3}
        titulo={
          programa === 'musica'
            ? 'Que instrumento queres aprender?'
            : programa === 'bebes'
              ? 'Escolhe a turma indicada'
              : 'Que modalidade queres aprender?'
        }
        entrada="Mostramos só o que serve a idade indicada."
        resumo={`${NOME_ESCOLA[programa] ?? programa} · ${idadeNum} anos`}
        mudarHref="/"
      >
        {sugestao && (
          <p className="v-aviso">
            {sugestao.texto}
            {sugestao.acao && (
              <>
                {' '}
                <Link href={sugestao.acao.href}>{sugestao.acao.texto}</Link>
              </>
            )}
          </p>
        )}

        <div className="v-grelha">
          {ordenados.map((i) => {
            const nome = programa === 'danca' ? i.titulo : i.nome
            // Um nome longo numa coluna de metade do ecrã parte-se em três
            // linhas e desalinha a grelha toda. Esses ocupam a linha
            // inteira, com a imagem ao lado em vez de por cima. Treze
            // caracteres é onde "Baixo Elétrico" e "Teoria Musical"
            // deixam de caber a 375px.
            const larga = nome.length >= 13
            const conteudo = (
              <>
                <i>
                  {i.imagem_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imagem_url} alt="" />
                  )}
                </i>
                <strong>{nome}</strong>
                {i.idade && <small>{i.idade}</small>}
                <span aria-hidden="true">›</span>
              </>
            )
            const classe = `v-opcao${larga ? ' v-larga' : ''}`
            return i.elegivel ? (
              <Link
                key={i.id}
                href={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${i.id}`}
                className={classe}
              >
                {conteudo}
              </Link>
            ) : (
              <div key={i.id} className={classe} aria-disabled="true">
                {conteudo}
              </div>
            )
          })}
        </div>
      </WizardVitrine>
    )
  }

  const { data: instrumentoAtual } = await supabase
    .from('instrumentos')
    .select('nome')
    .eq('id', instrumento)
    .single()

  if (instrumentoAtual && !elegivelParaDisciplina(idadeNum, programa, instrumentoAtual.nome)) {
    return (
      <WizardVitrine
        titulo="Não disponível para esta idade"
        voltar={`/pedir-aula?programa=${programa}&idade=${idadeNum}`}
        entrada="Esta disciplina não está disponível para a idade indicada."
      >
        <span />
      </WizardVitrine>
    )
  }

  // Passo 4: escolher professor — via função pública (só devolve nome/foto,
  // nunca profiles/professor_instrumentos diretamente).
  if (!professor) {
    const { data: professoresData } = await supabase.rpc('professores_publicos', {
      instrumento_id_param: Number(instrumento),
    })

    const professores = (
      (professoresData ?? []) as {
        professor_id: string
        nome: string
        foto_url: string | null
        especialidade: string | null
        adere_recomendacao: boolean
      }[]
    )
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))

    const nomeInstrumento = instrumentoAtual?.nome ?? ''

    return (
      <WizardVitrine
        voltar={`/pedir-aula?programa=${programa}&idade=${idadeNum}`}
        passo={4}
        titulo="Escolhe o professor"
        entrada="Toca no i para conhecer cada um antes de decidir."
        resumo={`${NOME_ESCOLA[programa] ?? programa} · ${idadeNum} anos · ${nomeInstrumento}`}
        mudarHref={`/pedir-aula?programa=${programa}&idade=${idadeNum}`}
      >
        {professores.length ? (
          <>
            {/* A linha inteira escolhe o professor e o "i" abre a ficha.
                Duas ligações, não uma dentro da outra — isso não é HTML
                válido. A que escolhe estica-se por cima da linha toda com
                um ::after, e o "i" fica por cima dela. */}
            <div className="v-lista">
              {professores.map((p) => (
                <div key={p.professor_id} className="v-lista-linha">
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt="" />
                  ) : (
                    <i aria-hidden="true">{p.nome.slice(0, 1)}</i>
                  )}
                  <Link
                    href={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${instrumento}&professor=${p.professor_id}`}
                    className="v-lista-alvo"
                  >
                    <strong>{p.nome}</strong>
                    {p.especialidade && <small>{p.especialidade}</small>}
                  </Link>
                  <Link
                    href={`/professor/${p.professor_id}?voltar=${encodeURIComponent(
                      `/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${instrumento}`
                    )}`}
                    className="v-lista-info"
                    aria-label={`Conhecer ${p.nome}`}
                  >
                    i
                  </Link>
                  <span className="v-lista-seta" aria-hidden="true">
                    ›
                  </span>
                </div>
              ))}
            </div>
            <div className="v-entre-tracos">
              <p>
                Não faz mal enganares-te: no passo seguinte ainda podes voltar atrás sem perder
                nada.
              </p>
            </div>
          </>
        ) : (
          <p className="v-passo-entrada">Ainda não há professores para esta disciplina.</p>
        )}
      </WizardVitrine>
    )
  }

  // Passo 5: escolher horários + mensagem — grelha igual à do wizard
  // autenticado, mas entregue a um componente cliente (formulario-pedido)
  // que decide, no momento do "Enviar pedido", se mostra o popup de conta.
  // A adesão ao Programa vem pela função pública, e não de perfis_escola:
  // aqui ainda se pode estar sem sessão, e essa tabela só abre a quem
  // entrou. A conta cria-se no fim, ao carregar em "Enviar pedido".
  const [{ data: professoresDoInstrumento }, { data: professoresDaEscola }] = await Promise.all([
    supabase.rpc('professores_publicos', { instrumento_id_param: Number(instrumento) }),
    // A lista para o seletor do campo de recomendação. Vem sempre, mesmo
    // que o campo não chegue a aparecer: é uma consulta de dois campos e
    // pedi-la só quando é precisa obrigaria a esperar por ela depois de
    // já se saber se o professor aderiu.
    supabase.rpc('professores_para_recomendacao'),
  ])
  const professorEscolhido = (
    (professoresDoInstrumento ?? []) as {
      professor_id: string
      nome: string
      adere_recomendacao: boolean
    }[]
  ).find((p) => p.professor_id === professor)

  const { data: horarios } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, estado')
    .eq('professor_id', professor)

  const horariosGrade = (horarios ?? []).filter((h) => DIAS_GRADE.includes(h.dia_semana))
  const semHorarios = horariosGrade.length === 0
  // Os bloqueados ficam à vista mas não se escolhem — e por isso não
  // contam para o aviso do "só uma opção".
  const horariosDisponiveis = horariosGrade.filter((h) => h.estado !== 'bloqueado').length

  const horariosPorDia: Record<string, typeof horariosGrade> = {}
  for (const dia of DIAS_GRADE) horariosPorDia[dia] = []
  for (const h of horariosGrade) horariosPorDia[h.dia_semana]?.push(h)
  for (const dia of DIAS_GRADE) {
    horariosPorDia[dia]?.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }

  const primeiroNome = (professorEscolhido?.nome ?? '').split(' ')[0]

  return (
    <WizardVitrine
      voltar={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${instrumento}`}
      passo={5}
      titulo="Quando é que dá jeito?"
      entrada={
        primeiroNome
          ? `Escolhe todas as opções possíveis — ${primeiroNome} decide depois qual fica confirmada.`
          : 'Escolhe todas as opções possíveis — o professor decide depois qual fica confirmada.'
      }
    >
      <FormularioPedido
        diasGrade={DIAS_GRADE}
        horariosPorDia={horariosPorDia}
        semHorarios={semHorarios}
        horariosDisponiveis={horariosDisponiveis}
        instrumentoId={instrumento}
        instrumentoNome={instrumentoAtual?.nome ?? ''}
        professorId={professor}
        professorAdereRecomendacao={professorEscolhido?.adere_recomendacao ?? false}
        professorNome={professorEscolhido?.nome ?? ''}
        professoresParaRecomendacao={
          (professoresDaEscola ?? []) as ProfessorParaRecomendacao[]
        }
        programa={programa}
        idade={idadeNum}
        autenticado={!!user}
        erroInicial={erro}
      />
    </WizardVitrine>
  )
}


// Nota mostrada quando nenhuma disciplina da escola serve a idade dada.
// Diz o limite pelos números reais das disciplinas (e não por um texto
// fixo que envelhece quando a escola muda a oferta), e encaminha para a
// escola vizinha quando há uma que cobre essa idade.
function construirSugestao(
  programa: 'musica' | 'danca' | 'bebes',
  idade: number,
  faixas: { min: number; max: number }[]
): { texto: string; acao?: { texto: string; href: string } } | null {
  if (faixas.length === 0) return null

  const minimo = Math.min(...faixas.map((f) => f.min))
  const maximo = Math.max(...faixas.map((f) => f.max))
  const escola = NOME_ESCOLA[programa] ?? programa

  // Novo demais. É o caso comum: um pai com uma criança pequena entra
  // em Música porque é o nome que conhece.
  if (idade < minimo) {
    const texto = `Com ${idade} ${idade === 1 ? 'ano' : 'anos'}, ainda não há nada em ${escola} — começa aos ${minimo}.`
    // "Primeiros sons" existe justamente para esta idade; mandar para lá
    // é mais útil do que mandar de volta à página inicial.
    return programa !== 'bebes' && idade <= 5
      ? {
          texto,
          acao: { texto: 'Ver Primeiros sons →', href: `/pedir-aula?programa=bebes&idade=${idade}` },
        }
      : { texto }
  }

  // Crescido demais. Em "Primeiros sons" é o que acontece a partir dos
  // 6 anos, e aí a Música é o passo seguinte natural.
  const texto = `Com ${idade} anos já não há nada em ${escola} — vai até aos ${maximo}.`
  return programa === 'bebes'
    ? {
        texto,
        acao: { texto: 'Ver Música →', href: `/pedir-aula?programa=musica&idade=${idade}` },
      }
    : { texto }
}
