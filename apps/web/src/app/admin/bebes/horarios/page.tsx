import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VoltarAtras } from '@/components/voltar-atras'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { SubmitButton } from '@/components/submit-button'
import { BotaoAcaoDestruir } from '@/components/botao-acao-destruir'
import { classesCampo } from '@/components/campo-formulario'
import { DIAS_SEMANA, formatarHora } from '@ccg/core'
import {
  mudarHorarioTurmaBebes,
  atribuirProfessorTurmaBebes,
  removerProfessorTurmaBebes,
} from '@/lib/actions/bebes'
import { ConfirmarHorarioTurma } from '@/components/confirmar-horario-turma'

type Turma = {
  id: number
  instrumento_id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  capacidade: number
  instrumentos: { nome: string } | null
}

export default async function AdminBebesHorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; guardado?: string }>
}) {
  const { erro, guardado } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfis_escola')
    .select('admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.admin) redirect('/dashboard')

  const { data: turmasData } = await supabase
    .from('turmas_bebes')
    .select('id, instrumento_id, dia_semana, hora_inicio, hora_fim, capacidade, instrumentos(nome)')
    .order('hora_inicio')
  const turmas = (turmasData ?? []) as unknown as Turma[]

  const [{ data: atribuidos }, { data: professores }] = await Promise.all([
    supabase
      .from('turmas_bebes_professores')
      .select('turma_id, professor_id, profiles(nome)'),
    // Qualquer professor pode dar Bebés: é uma atribuição a mais e não
    // uma escola diferente. Por isso a lista não é filtrada por programa.
    supabase.from('perfis_escola').select('id, profiles(nome)').eq('tipo', 'professor'),
  ])

  const porTurma = new Map<number, { id: string; nome: string }[]>()
  for (const a of (atribuidos ?? []) as unknown as {
    turma_id: number
    professor_id: string
    profiles: { nome: string } | null
  }[]) {
    const lista = porTurma.get(a.turma_id) ?? []
    lista.push({ id: a.professor_id, nome: a.profiles?.nome ?? 'Sem nome' })
    porTurma.set(a.turma_id, lista)
  }

  const todos = ((professores ?? []) as unknown as {
    id: string
    profiles: { nome: string } | null
  }[])
    .map((p) => ({ id: p.id, nome: p.profiles?.nome ?? 'Sem nome' }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))

  // Quantos estão inscritos em cada turma, para a secretaria ver quando
  // está a chegar ao limite.
  const ocupacoes = new Map<number, number>()
  for (const t of turmas) {
    const { data } = await supabase.rpc('ocupacao_turma_bebes', { p_turma_id: t.id })
    ocupacoes.set(t.id, Number(data ?? 0))
  }

  return (
    <main id="conteudo-principal" className="partitura-pagina admin-subficha-pagina">
      <div className="partitura-folha">
        <header className="partitura-agenda-cabecalho">
          <VoltarAtras destino="/admin/bebes" className="partitura-voltar" rotulo="Voltar à escola de bebés">←</VoltarAtras>
          <div>
            <p className="partitura-sobretitulo">Música para Bebés</p>
            <h1>Horários e professores</h1>
            <p>O horário é da escola. Mudá-lo avisa os professores e as famílias.</p>
          </div>
        </header>

        {erro && <MensagemErro>{decodeURIComponent(erro)}</MensagemErro>}
        {guardado && <MensagemInfo>{decodeURIComponent(guardado)}</MensagemInfo>}

        {turmas.map((turma, indice) => {
          const daTurma = porTurma.get(turma.id) ?? []
          const porAtribuir = todos.filter((p) => !daTurma.some((d) => d.id === p.id))
          const inscritos = ocupacoes.get(turma.id) ?? 0
          return (
            <section key={turma.id} className="partitura-seccao">
              <div className="partitura-seccao-cabecalho">
                <div>
                  <p className="partitura-indice">{String(indice + 1).padStart(2, '0')}</p>
                  <h2>{turma.instrumentos?.nome}</h2>
                </div>
              </div>

              <p className="text-sm" style={{ color: 'var(--color-tinta-suave)' }}>
                {turma.dia_semana}, {formatarHora(turma.hora_inicio)}–{formatarHora(turma.hora_fim)}
                {' · '}
                {inscritos} de {turma.capacidade} {inscritos === 1 ? 'inscrito' : 'inscritos'}
                {inscritos >= turma.capacidade ? ' · turma cheia' : ''}
              </p>

              {/* A confirmação é obrigatória: mudar a hora mexe no sábado
                  de dez famílias, e é o tipo de coisa que não se faz por
                  engano num campo de horas. */}
              <ConfirmarHorarioTurma
                turmaId={turma.id}
                nome={turma.instrumentos?.nome ?? 'a turma'}
                diaAtual={turma.dia_semana}
                inicioAtual={turma.hora_inicio.slice(0, 5)}
                fimAtual={turma.hora_fim.slice(0, 5)}
                inscritos={inscritos}
                dias={[...DIAS_SEMANA]}
                action={mudarHorarioTurmaBebes}
              />

              <div className="horarios-alunos" style={{ marginTop: 18 }}>
                {daTurma.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--color-tinta-suave)' }}>
                    Ainda não há professores nesta turma. Sem professor, a turma não pode
                    receber inscrições.
                  </p>
                )}
                {daTurma.map((p) => (
                  <div key={p.id} className="horarios-aluno">
                    <span>
                      <strong>{p.nome}</strong>
                      <small>Dá esta turma</small>
                    </span>
                    <span>
                      <BotaoAcaoDestruir
                        label="Retirar"
                        titulo="Retirar da turma?"
                        mensagem={`${p.nome} deixa de dar ${turma.instrumentos?.nome}.\n\nSe já tiver alunos inscritos, o horário dele mantém-se — as aulas que existem não se desfazem sozinhas.`}
                        action={removerProfessorTurmaBebes}
                      >
                        <input type="hidden" name="turmaId" value={turma.id} />
                        <input type="hidden" name="professorId" value={p.id} />
                      </BotaoAcaoDestruir>
                    </span>
                  </div>
                ))}
              </div>

              {porAtribuir.length > 0 && (
                <form action={atribuirProfessorTurmaBebes} className="space-y-2" style={{ marginTop: 14 }}>
                  <input type="hidden" name="turmaId" value={turma.id} />
                  <label className="block text-[12.5px] font-medium" htmlFor={`prof-${turma.id}`} style={{ color: 'var(--color-tinta-suave)' }}>
                    Acrescentar professor
                  </label>
                  <select id={`prof-${turma.id}`} name="professorId" required defaultValue="" className={classesCampo}>
                    <option value="" disabled>Escolhe</option>
                    {porAtribuir.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  <SubmitButton textoAGuardar="A atribuir…" className="horarios-criar-botao">
                    Atribuir à turma
                  </SubmitButton>
                </form>
              )}
            </section>
          )
        })}
      </div>
    </main>
  )
}
