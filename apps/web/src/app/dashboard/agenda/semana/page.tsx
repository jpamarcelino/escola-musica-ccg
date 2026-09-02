import type { CSSProperties } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/empty-state'
import { DescarregarGrelha, type AulaGrelha } from '@/components/descarregar-grelha'
import {
  DIAS_SEMANA,
  paraMinutos,
  formatarHora,
  formatarSala,
  agoraNaEscola,
  type DiaSemana,
} from '@ccg/core'
import { VoltarAtras } from '@/components/voltar-atras'

// Altura de uma hora na grelha. Mais baixa do que o HOUR_HEIGHT de 64 px
// usado nas grelhas de secretaria: aqui o objetivo é a semana inteira
// caber num ecrã de telemóvel sem scroll vertical, e uma aula de 45
// minutos ainda fica com 42 px — suficiente para a hora e o nome.
const ALTURA_HORA = 56

type Confirmado = {
  horario_final_id: number | null
  alunos: { nome: string } | null
  instrumentos: { nome: string } | null
  horarios: {
    dia_semana: DiaSemana
    hora_inicio: string
    hora_fim: string
    salas: { nome: string; piso: number | null; numero: number | null } | null
  } | null
}

type Bloco = {
  horarioId: number
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fim: string
  sala: string | null
  alunos: string[]
  disciplinas: string[]
}

// A grelha semanal vive numa página própria e já não dentro de um
// <details> no fundo da agenda. São duas perguntas diferentes: a agenda
// responde a "o que tenho a seguir", a grelha a "como é a minha semana".
// Espremida num acordeão, a segunda nunca chegava a ter desenho nenhum.
export default async function SemanaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: perfil }] = await Promise.all([
    supabase.from('perfis_escola').select('tipo, programa').eq('id', user.id).single(),
    supabase.from('profiles').select('nome').eq('id', user.id).maybeSingle(),
  ])

  if (profile?.tipo !== 'professor') {
    redirect('/dashboard')
  }

  const { data: confirmadosData } = await supabase
    .from('matriculas')
    .select(
      'horario_final_id, alunos(nome), instrumentos(nome), horarios(dia_semana, hora_inicio, hora_fim, salas(nome, piso, numero))'
    )
    .eq('professor_id', user.id)
    .eq('estado', 'confirmado')
    .not('horario_final_id', 'is', null)
    .order('criado_em')
  const confirmados = (confirmadosData ?? []) as unknown as Confirmado[]

  // Agrupa por horário — mais que um aluno pode partilhar a mesma hora
  // (aula de grupo em dança).
  const porHorario = new Map<number, Bloco>()
  for (const c of confirmados) {
    if (!c.horario_final_id || !c.horarios) continue
    const bloco = porHorario.get(c.horario_final_id) ?? {
      horarioId: c.horario_final_id,
      dia_semana: c.horarios.dia_semana,
      hora_inicio: c.horarios.hora_inicio,
      hora_fim: c.horarios.hora_fim,
      sala: formatarSala(c.horarios.salas),
      alunos: [],
      disciplinas: [],
    }
    if (c.alunos?.nome) bloco.alunos.push(c.alunos.nome)
    const disciplina = c.instrumentos?.nome
    if (disciplina && !bloco.disciplinas.includes(disciplina)) bloco.disciplinas.push(disciplina)
    porHorario.set(c.horario_final_id, bloco)
  }
  const blocos = [...porHorario.values()]

  const agora = agoraNaEscola()
  const diaHoje = DIAS_SEMANA[(agora.getDay() + 6) % 7]

  if (blocos.length === 0) {
    return (
      <main id="conteudo-principal" className="pinterest-semana">
        <div className="pinterest-semana-folha">
          <header className="pinterest-semana-cabecalho">
            <VoltarAtras destino="/dashboard/agenda" className="pinterest-semana-voltar" rotulo="Voltar à agenda" tamanho={23} />
            <div>
              <h1>Semana</h1>
              <p>A tua grelha de horários</p>
            </div>
          </header>
          <EmptyState
            titulo="Ainda não tens aulas confirmadas"
            descricao="A grelha aparece assim que confirmares o primeiro horário."
          />
        </div>
      </main>
    )
  }

  // Só os dias com aulas. Um professor que dá segunda a sexta não precisa
  // de duas colunas vazias a roubar largura ao telemóvel — e as colunas
  // que ficam podem ser mais largas.
  const dias = DIAS_SEMANA.filter((dia) => blocos.some((b) => b.dia_semana === dia))

  const primeiraHora = Math.floor(Math.min(...blocos.map((b) => paraMinutos(b.hora_inicio))) / 60)
  const ultimaHora = Math.ceil(Math.max(...blocos.map((b) => paraMinutos(b.hora_fim))) / 60)
  const horas = Array.from({ length: ultimaHora - primeiraHora }, (_, i) => primeiraHora + i)
  const alturaCorpo = horas.length * ALTURA_HORA

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes()
  const mostrarAgora =
    dias.includes(diaHoje) && minutosAgora >= primeiraHora * 60 && minutosAgora <= ultimaHora * 60
  const topoAgora = ((minutosAgora - primeiraHora * 60) / 60) * ALTURA_HORA

  const aulasParaFolha: AulaGrelha[] = blocos
    .filter((b) => dias.includes(b.dia_semana))
    .map((b) => ({
      dia: b.dia_semana,
      inicio: b.hora_inicio,
      fim: b.hora_fim,
      etiqueta: `${formatarHora(b.hora_inicio)}–${formatarHora(b.hora_fim)}`,
      titulo: b.disciplinas.length ? b.disciplinas.join(' · ') : b.alunos.join(', '),
      detalhe: b.alunos.join(', '),
    }))

  // O ano letivo do CCG vai de outubro a junho: até junho ainda se está no
  // que começou no ano anterior.
  const inicioAno = agora.getMonth() >= 8 ? agora.getFullYear() : agora.getFullYear() - 1
  const anoLetivo = `${inicioAno}/${inicioAno + 1}`

  const totalAlunos = new Set(
    confirmados.filter((c) => c.alunos?.nome).map((c) => c.alunos!.nome)
  ).size

  return (
    <main id="conteudo-principal" className="pinterest-semana">
      <div className="pinterest-semana-folha">
        <header className="pinterest-semana-cabecalho">
          <VoltarAtras destino="/dashboard/agenda" className="pinterest-semana-voltar" rotulo="Voltar à agenda" tamanho={23} />
          <div>
            <h1>Semana</h1>
            <p>A tua grelha de horários</p>
          </div>
        </header>

        {/* Contagens reais, tiradas dos mesmos dados da grelha. */}
        <div className="pinterest-semana-resumo">
          <div>
            <strong>{blocos.length}</strong>
            <span>{blocos.length === 1 ? 'aula por semana' : 'aulas por semana'}</span>
          </div>
          <div>
            <strong>{totalAlunos}</strong>
            <span>{totalAlunos === 1 ? 'aluno' : 'alunos'}</span>
          </div>
          <div>
            <strong>
              {formatarHora(`${String(primeiraHora).padStart(2, '0')}:00`)}
            </strong>
            <span>primeira hora</span>
          </div>
        </div>

        <div className="pinterest-semana-grelha">
          <div
            className="pinterest-semana-interior"
            style={{ '--altura-hora': `${ALTURA_HORA}px` } as CSSProperties}
          >
            {/* A régua das horas fica colada à esquerda enquanto se
                arrasta a semana na horizontal. */}
            <div className="pinterest-semana-regua">
              <div className="pinterest-semana-regua-topo" />
              <div className="pinterest-semana-regua-corpo" style={{ height: alturaCorpo }}>
                {horas.map((hora) => (
                  <span key={hora} style={{ height: ALTURA_HORA }}>
                    {hora}h
                  </span>
                ))}
              </div>
            </div>

            {dias.map((dia) => (
              <div
                key={dia}
                className={`pinterest-semana-dia ${dia === diaHoje ? 'pinterest-semana-dia-hoje' : ''}`}
              >
                <div className="pinterest-semana-dia-topo">
                  <abbr title={dia}>{dia.slice(0, 3)}</abbr>
                </div>
                <div className="pinterest-semana-dia-corpo" style={{ height: alturaCorpo }}>
                  {/* As linhas das horas são fundo e não elementos: uma
                      div por hora e por dia enchia a árvore de nós que
                      nada dizem a um leitor de ecrã. */}
                  {dia === diaHoje && mostrarAgora && (
                    <div
                      className="pinterest-semana-agora"
                      style={{ top: topoAgora }}
                      aria-label={`Agora, ${formatarHora(`${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`)}`}
                    >
                      <span aria-hidden="true" />
                    </div>
                  )}
                  {blocos
                    .filter((b) => b.dia_semana === dia)
                    .map((b) => {
                      const inicio = paraMinutos(b.hora_inicio)
                      const fim = paraMinutos(b.hora_fim)
                      const estilo = {
                        top: ((inicio - primeiraHora * 60) / 60) * ALTURA_HORA,
                        height: ((fim - inicio) / 60) * ALTURA_HORA,
                      } as CSSProperties
                      const legenda = b.disciplinas.length
                        ? b.disciplinas.join(' · ')
                        : b.alunos.join(', ')
                      return (
                        <Link
                          key={b.horarioId}
                          href={`/dashboard/agenda/${b.horarioId}`}
                          className="pinterest-semana-bloco"
                          style={estilo}
                          title={`${dia}, ${formatarHora(b.hora_inicio)}–${formatarHora(b.hora_fim)}${b.sala ? ` · ${b.sala}` : ''} — ${b.alunos.join(', ')}`}
                        >
                          <time>{formatarHora(b.hora_inicio)}</time>
                          <small>{legenda}</small>
                        </Link>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* A folha descarregada é desenhada de raiz e não fotografada do
            ecrã — leva sempre a semana toda, não o pedaço que coube no
            telemóvel de quem carregou no botão. */}
        <DescarregarGrelha
          dias={[...dias]}
          aulas={aulasParaFolha}
          primeiraHora={primeiraHora}
          ultimaHora={ultimaHora}
          nome={perfil?.nome ?? 'Horário'}
          anoLetivo={anoLetivo}
        />

        <p className="pinterest-semana-nota">
          Toca numa aula para ver quem vem. Arrasta para o lado se a semana não couber no ecrã.
        </p>
      </div>
    </main>
  )
}
