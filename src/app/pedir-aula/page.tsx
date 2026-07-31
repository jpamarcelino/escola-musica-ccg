import { createClient } from '@/lib/supabase/server'
import { DIAS_SEMANA } from '@/lib/dias-semana'
import { OptionCard } from '@/components/option-card'
import { BackButton } from '@/components/back-button'
import { SeletorIdade } from '@/components/seletor-idade'
import { FormularioPedido } from './formulario-pedido'
import {
  MUSICA_IDADE_MIN,
  MUSICA_IDADE_MAX,
  separarFaixaEtaria,
  parseFaixaEtaria,
  dentroDaFaixa,
  elegivelParaDisciplina,
} from '@/lib/idade-disciplinas'
import { HOUR_HEIGHT, paraMinutos } from '@/lib/horarios-grade'

// Dias mostrados na grelha, da esquerda para a direita. Sem Domingo — a
// escola não funciona nesse dia.
const DIAS_GRADE = DIAS_SEMANA.slice(0, 6)

// Mesma afinação visual do wizard autenticado (src/app/aluno/[alunoId]/pedido/page.tsx).
const ICONE_PADDING: Record<string, string | undefined> = {
  Guitarra: '14%',
  'Baixo Elétrico': '14%',
  Bateria: '14%',
  Concertina: '18%',
  'Teoria Musical': '18%',
}

const DANCA_ICONE_PADDING: Record<string, string> = {
  'Ballet Clássico': '12%',
  'Dança Moderna': '9%',
  'Dança Contemporânea': '9%',
  'Dança Moderna para Adultos': '5%',
  'Estilos Urbanos': '5%',
}

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

  // Passo 1: idade do futuro aluno (só filtra os cartões seguintes) — vem
  // antes de escolher a escola, para logo se saber o que mostrar a azul.
  if (idadeNum === null) {
    return (
      <Wizard voltar="/">
        <SeletorIdade />
      </Wizard>
    )
  }

  // Passo 2: escolher escola
  if (programa !== 'musica' && programa !== 'danca' && programa !== 'bebes') {
    return (
      <Wizard voltar="/pedir-aula">
        <div className="option-stack">
          <OptionCard href={`/pedir-aula?idade=${idadeNum}&programa=musica`} nome={'Escola\nde\nMúsica'} wide index={0} />
          <OptionCard href={`/pedir-aula?idade=${idadeNum}&programa=danca`} nome={'Escola\nde\nDança'} wide index={1} />
          <OptionCard href={`/pedir-aula?idade=${idadeNum}&programa=bebes`} nome={'Música\npara\nBebés'} wide index={2} />
        </div>
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
          elegivel: dentroDaFaixa(idadeNum, parseFaixaEtaria(faixa)),
        }
      }
      if (programa === 'bebes') {
        return {
          ...i,
          titulo: i.nome,
          idade: undefined as string | undefined,
          elegivel: dentroDaFaixa(idadeNum, parseFaixaEtaria(i.nome)),
        }
      }
      return {
        ...i,
        titulo: i.nome,
        idade: undefined as string | undefined,
        elegivel: dentroDaFaixa(idadeNum, { min: MUSICA_IDADE_MIN, max: MUSICA_IDADE_MAX }),
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
        voltar={`/pedir-aula?idade=${idadeNum}`}
      >
        <div className="option-grid">
          {ordenados.map((i, idx) =>
            programa === 'danca' ? (
              <OptionCard
                key={i.id}
                href={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${i.id}`}
                nome={i.titulo}
                subtitulo={i.idade}
                imagemUrl={i.imagem_url}
                icone
                iconePadding={DANCA_ICONE_PADDING[i.titulo] ?? '12%'}
                tituloNegrito
                index={idx}
                bloqueado={!i.elegivel}
              />
            ) : (
              <OptionCard
                key={i.id}
                href={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${i.id}`}
                nome={i.nome}
                imagemUrl={i.imagem_url}
                icone
                iconePadding={ICONE_PADDING[i.nome]}
                index={idx}
                bloqueado={!i.elegivel}
              />
            )
          )}
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
      <Wizard title="Não disponível para esta idade" voltar={`/pedir-aula?programa=${programa}&idade=${idadeNum}`}>
        <p className="text-sm text-foreground/60">
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
      }[]
    )
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))

    return (
      <Wizard title="Escolhe o professor" voltar={`/pedir-aula?programa=${programa}&idade=${idadeNum}`}>
        {professores.length ? (
          <div className="option-grid">
            {professores.map((p, idx) => (
              <OptionCard
                key={p.professor_id}
                href={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${instrumento}&professor=${p.professor_id}`}
                nome={p.nome}
                imagemUrl={p.foto_url}
                subtitulo={p.especialidade}
                index={idx}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/60">Ainda não há professores para esta disciplina.</p>
        )}
      </Wizard>
    )
  }

  // Passo 5: escolher horários + mensagem — grelha igual à do wizard
  // autenticado, mas entregue a um componente cliente (formulario-pedido)
  // que decide, no momento do "Enviar pedido", se mostra o popup de conta.
  const { data: horarios } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fim, estado')
    .eq('professor_id', professor)

  const horariosGrade = (horarios ?? []).filter((h) => DIAS_GRADE.includes(h.dia_semana))
  const semHorarios = horariosGrade.length === 0

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
      title="Seleciona os vários horários em que há disponibilidade"
      voltar={`/pedir-aula?programa=${programa}&idade=${idadeNum}&instrumento=${instrumento}`}
    >
      <FormularioPedido
        diasGrade={DIAS_GRADE}
        horariosPorDia={horariosPorDia}
        horas={horas}
        horaInicioGrade={horaInicioGrade}
        alturaGrade={alturaGrade}
        semHorarios={semHorarios}
        instrumentoId={instrumento}
        professorId={professor}
        autenticado={!!user}
        erroInicial={erro}
      />
    </Wizard>
  )
}

function Wizard({
  title,
  voltar,
  children,
}: {
  title?: string
  voltar?: string
  children: React.ReactNode
}) {
  return (
    <main className="flex-1 flex items-start justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        {voltar && <BackButton href={voltar} />}
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
        {children}
      </div>
    </main>
  )
}
