import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Info } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DIAS_SEMANA, MUSICA_IDADE_MIN, MUSICA_IDADE_MAX, separarFaixaEtaria, parseFaixaEtaria, dentroDaFaixa, elegivelParaDisciplina, HOUR_HEIGHT, paraMinutos } from '@ccg/core'
import { Wizard } from '@/components/wizard'
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
      <Wizard
        publico
        voltar="/"
        passo={2}
        escolhas={[{ valor: NOME_ESCOLA[programa] ?? programa, href: '/' }]}
      >
        <SeletorIdade />
      </Wizard>
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
      <Wizard
        publico
        title={
          programa === 'musica'
            ? 'Que instrumento queres aprender?'
            : programa === 'bebes'
              ? 'Escolha a turma indicada'
              : 'Que modalidade queres aprender?'
        }
        voltar="/"
        passo={3}
        escolhas={[
          { valor: NOME_ESCOLA[programa] ?? programa, href: '/' },
          { valor: `${idadeNum} anos`, href: `/pedir-aula?programa=${programa}` },
        ]}
      >
        {sugestao && (
          <p className="pinterest-pedido-aviso">
            {sugestao.texto}
            {sugestao.acao && (
              <>
                {' '}
                <Link href={sugestao.acao.href}>{sugestao.acao.texto}</Link>
              </>
            )}
          </p>
        )}

        {/* Marcação própria do percurso público em vez do CartaoLink: o
            componente traz estilos inline que o CSS não sobrepõe, e é
            usado pelo percurso autenticado, que ainda tem o aspeto
            antigo. O handoff pede para só consolidar componentes depois
            de haver dois ou três exemplos reais. */}
        <div className="pinterest-pedido-opcoes">
          {ordenados.map((i) => {
            const nome = programa === 'danca' ? i.titulo : i.nome
            return i.elegivel ? (
              <Link
                key={i.id}
                href={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${i.id}`}
                className="pinterest-pedido-opcao"
              >
                <span className="pinterest-pedido-opcao-imagem">
                  {i.imagem_url ? (
                    <Image src={i.imagem_url} width={80} height={80} alt="" />
                  ) : null}
                </span>
                <span className="pinterest-pedido-opcao-texto">
                  <strong>{nome}</strong>
                  {i.idade ? <small>{i.idade}</small> : null}
                </span>
                <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
              </Link>
            ) : (
              // A etiqueta vai dentro do bloco de texto e não numa linha
              // própria da grelha: solta, abria um vazio por baixo do
              // nome e fazia o cartão bloqueado ficar maior do que os que
              // se podem escolher.
              <div key={i.id} className="pinterest-pedido-opcao" aria-disabled="true">
                <span className="pinterest-pedido-opcao-imagem">
                  {i.imagem_url ? (
                    <Image src={i.imagem_url} width={80} height={80} alt="" />
                  ) : null}
                </span>
                <span className="pinterest-pedido-opcao-texto">
                  <strong>{nome}</strong>
                  {i.idade ? <small>{i.idade}</small> : null}
                  <span className="pinterest-pedido-opcao-nota">Fora da faixa etária</span>
                </span>
                <span />
              </div>
            )
          })}
        </div>
      </Wizard>
    )
  }

  const { data: instrumentoAtual } = await supabase
    .from('instrumentos')
    .select('nome')
    .eq('id', instrumento)
    .single()

  if (instrumentoAtual && !elegivelParaDisciplina(idadeNum, programa, instrumentoAtual.nome)) {
    return (
      // Este beco é da página pública como qualquer outro passo — sem
      // `publico` ficava com a moldura antiga e o rodapé legal sumia.
      <Wizard
        publico
        title="Não disponível para esta idade"
        voltar={`/pedir-aula?programa=${programa}&idade=${idadeNum}`}
      >
        <p className="pinterest-pedido-vazio">
          Esta disciplina não está disponível para a idade indicada.
        </p>
      </Wizard>
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

    return (
      <Wizard
        publico
        title="Escolhe o professor"
        voltar={`/pedir-aula?programa=${programa}&idade=${idadeNum}`}
        passo={4}
        escolhas={[
          { valor: NOME_ESCOLA[programa] ?? programa, href: '/' },
          { valor: `${idadeNum} anos`, href: `/pedir-aula?programa=${programa}` },
        ]}
      >
        {professores.length ? (
          <div className="pinterest-pedido-opcoes">
            {professores.map((p) => (
              // Duas ações no mesmo cartão — escolher e conhecer — e um
              // link não pode viver dentro de outro. Ficam lado a lado.
              <div key={p.professor_id} className="pinterest-pedido-opcao-dupla">
                <Link
                  href={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${instrumento}&professor=${p.professor_id}`}
                  className="pinterest-pedido-opcao"
                >
                  {/* Sem foto, a inicial — uma caixa cinzenta vazia
                      lê-se como imagem que não carregou. */}
                  <span className="pinterest-pedido-opcao-imagem" data-cobre="sim">
                    {p.foto_url ? (
                      <Image src={p.foto_url} width={104} height={104} alt="" />
                    ) : (
                      <span className="pinterest-pedido-opcao-inicial" aria-hidden="true">
                        {p.nome.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="pinterest-pedido-opcao-texto">
                    <strong>{p.nome}</strong>
                    {p.especialidade ? <small>{p.especialidade}</small> : null}
                  </span>
                  <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
                </Link>
                <Link
                  href={`/professor/${p.professor_id}?voltar=${encodeURIComponent(
                    `/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${instrumento}`
                  )}`}
                  className="pinterest-pedido-conhecer"
                  aria-label={`Conhecer ${p.nome}`}
                >
                  <Info size={19} strokeWidth={2} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="pinterest-pedido-vazio">
            Ainda não há professores para esta disciplina.
          </p>
        )}
      </Wizard>
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

  const horaInicioGrade = semHorarios
    ? 0
    : Math.floor(Math.min(...horariosGrade.map((h) => paraMinutos(h.hora_inicio))) / 60)
  const horaFimGrade = semHorarios
    ? 0
    : Math.ceil(Math.max(...horariosGrade.map((h) => paraMinutos(h.hora_fim))) / 60)
  const horas = Array.from({ length: horaFimGrade - horaInicioGrade }, (_, i) => horaInicioGrade + i)
  const alturaGrade = horas.length * HOUR_HEIGHT

  const horariosPorDia: Record<string, typeof horariosGrade> = {}
  for (const dia of DIAS_GRADE) horariosPorDia[dia] = []
  for (const h of horariosGrade) horariosPorDia[h.dia_semana]?.push(h)
  for (const dia of DIAS_GRADE) {
    horariosPorDia[dia]?.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }

  return (
    <Wizard
        publico
      title="Seleciona os vários horários em que há disponibilidade"
      voltar={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${instrumento}`}
      passo={5}
      escolhas={[
        { valor: NOME_ESCOLA[programa] ?? programa, href: '/' },
        { valor: `${idadeNum} anos`, href: `/pedir-aula?programa=${programa}` },
      ]}
    >
      <FormularioPedido
        diasGrade={DIAS_GRADE}
        horariosPorDia={horariosPorDia}
        horas={horas}
        horaInicioGrade={horaInicioGrade}
        alturaGrade={alturaGrade}
        semHorarios={semHorarios}
        horariosDisponiveis={horariosDisponiveis}
        instrumentoId={instrumento}
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
    </Wizard>
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
