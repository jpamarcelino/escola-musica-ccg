'use client'

import { useRef, useState, useTransition } from 'react'
import { escolherDisponibilidades } from '@/lib/actions/aluno'
import { CampoRecomendacao, type ProfessorParaRecomendacao } from '@/components/campo-recomendacao'
import { ModalContaPedido, ModalEscolherAluno } from '@/components/modal-conta-pedido'
import { ModalUmHorario, deveAvisarUmHorario } from '@/components/confirmar-um-horario'
import { paraMinutos, formatarHora, type DiaSemana } from '@ccg/core'
import type { HorarioEstado, InstrumentoPrograma } from '@ccg/types'

type Horario = {
  id: number
  dia_semana: DiaSemana
  hora_inicio: string
  hora_fim: string
  estado: HorarioEstado
}

function duracao(inicio: string, fim: string): string {
  const minutos = paraMinutos(fim) - paraMinutos(inicio)
  if (minutos % 60 === 0) return `${minutos / 60} ${minutos === 60 ? 'hora' : 'horas'}`
  return `${minutos} minutos`
}

// Passo 5 do pedido público, na linguagem vitrine (Claude Design, 2d).
//
// Deixou de ser a grelha da semana. A grelha obrigava a apertar seis
// colunas em 375px, e cada aula ficava um bloco de 40px de largura com a
// hora em corpo 10. Aqui cada horário tem uma linha inteira: a hora à
// esquerda, a duração ao meio, o visto à direita.
//
// O "Enviar pedido" não faz um POST direto — primeiro garante que há
// sessão e um aluno escolhido (mostrando o popup de conta só se for
// preciso), e só depois envia. Os campos ficam montados por trás do
// popup, por isso nada do que já foi escolhido se perde.
export function FormularioPedido({
  diasGrade,
  horariosPorDia,
  semHorarios,
  horariosDisponiveis,
  instrumentoId,
  instrumentoNome,
  professorId,
  professorAdereRecomendacao,
  professorNome,
  professoresParaRecomendacao,
  programa,
  idade,
  autenticado,
  erroInicial,
}: {
  diasGrade: string[]
  horariosPorDia: Record<string, Horario[]>
  semHorarios: boolean
  horariosDisponiveis: number
  instrumentoId: string
  instrumentoNome: string
  professorId: string
  professorAdereRecomendacao: boolean
  professorNome: string
  professoresParaRecomendacao: ProfessorParaRecomendacao[]
  // Viajam com o pedido só para o erro poder devolver a pessoa a este
  // mesmo passo. Sem eles, o redirect de erro caía num /pedir-aula sem
  // escola nem idade — ou seja, no passo da idade, do início.
  programa: InstrumentoPrograma
  idade: number
  autenticado: boolean
  erroInicial?: string
}) {
  const [popup, setPopup] = useState<'conta' | 'aluno' | null>(null)
  const [avisoUmHorario, setAvisoUmHorario] = useState(false)
  const [escolhidos, setEscolhidos] = useState(0)
  const [aEnviar, iniciarEnvio] = useTransition()
  const [erro, setErro] = useState(erroInicial ?? '')
  const formRef = useRef<HTMLFormElement>(null)

  function enviarPedido(alunoId: string, formEl: HTMLFormElement) {
    setPopup(null)
    const dados = new FormData(formEl)
    dados.set('alunoId', alunoId)
    dados.set('origem', 'wizard-publico')
    // Chamar a Server Action diretamente (fora de um <form action>) exige
    // estar dentro de uma transição — é o que dá o redirect() final e o
    // estado "pending" corretos.
    iniciarEnvio(() => escolherDisponibilidades(dados))
  }

  function abrirPopupDeConta() {
    setPopup(autenticado ? 'aluno' : 'conta')
  }

  function aoSubmeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    const formEl = e.currentTarget
    const marcados = formEl.querySelectorAll('input[name="horarios"]:checked')
    const mensagem = (formEl.elements.namedItem('mensagem') as HTMLTextAreaElement)?.value.trim()
    if (marcados.length === 0 && !mensagem) {
      setErro('Escolhe pelo menos um horário ou escreve uma mensagem.')
      return
    }
    // Uma pausa antes do popup de conta, não depois: quem vai voltar à
    // lista para marcar mais horários não deve ter de passar primeiro
    // por entrar na conta.
    if (deveAvisarUmHorario(formEl, horariosDisponiveis)) {
      setAvisoUmHorario(true)
      return
    }
    abrirPopupDeConta()
  }

  function contar() {
    const n = formRef.current?.querySelectorAll('input[name="horarios"]:checked').length ?? 0
    setEscolhidos(n)
  }

  const diasComHorarios = diasGrade.filter((dia) => (horariosPorDia[dia] ?? []).length > 0)

  return (
    <>
      <form ref={formRef} onSubmit={aoSubmeter}>
        {semHorarios ? (
          <p className="v-passo-entrada">
            Este professor ainda não tem horários disponíveis. Podes deixar-lhe uma mensagem em
            baixo.
          </p>
        ) : (
          <div className="v-dias">
            {diasComHorarios.map((dia) => {
              const doDia = horariosPorDia[dia] ?? []
              const livres = doDia.filter((h) => h.estado !== 'bloqueado').length
              return (
                <section key={dia} className="v-dia">
                  <div className="v-dia-cabecalho">
                    <h2>{dia}</h2>
                    <small>
                      {livres === 0 ? 'sem vagas' : livres === 1 ? '1 livre' : `${livres} livres`}
                    </small>
                  </div>
                  <div className="v-dia-horarios">
                    {doDia.map((h) =>
                      h.estado === 'bloqueado' ? (
                        <div key={h.id} className="v-horario" data-ocupado="true">
                          <span className="v-horario-hora">{formatarHora(h.hora_inicio)}</span>
                          <span className="v-horario-texto">
                            <strong>{duracao(h.hora_inicio, h.hora_fim)}</strong>
                            <small>Ocupado</small>
                          </span>
                          <span aria-hidden="true" style={{ color: 'var(--v-tinta-fraca)' }}>
                            —
                          </span>
                        </div>
                      ) : (
                        <label key={h.id} className="v-horario">
                          <input
                            type="checkbox"
                            name="horarios"
                            value={h.id}
                            onChange={contar}
                          />
                          <span className="v-horario-hora">{formatarHora(h.hora_inicio)}</span>
                          <span className="v-horario-texto">
                            <strong>{duracao(h.hora_inicio, h.hora_fim)}</strong>
                            {/* A hora de início já está na coluna da
                                esquerda: repeti-la aqui era dizer duas
                                vezes a mesma coisa. */}
                            <small>
                              até às {formatarHora(h.hora_fim)}
                              {instrumentoNome ? ` · ${instrumentoNome}` : ''}
                            </small>
                          </span>
                          <span className="v-horario-visto" aria-hidden="true">
                            ✓
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}

        <div className="v-cartao-mensagem">
          <strong>Nenhum horário dá jeito?</strong>
          <p>Deixa uma mensagem em vez de escolher. O professor decide se entra em contacto.</p>
          <textarea
            id="mensagem"
            name="mensagem"
            rows={3}
            maxLength={500}
            placeholder="Ex: só posso às quintas a partir das 16h — dá para arranjar?"
            aria-label="Mensagem para o professor"
          />
        </div>

        {professorAdereRecomendacao && (
          <div style={{ margin: '24px 22px 0' }}>
            <CampoRecomendacao
              professorId={professorId}
              professorNome={professorNome}
              professores={professoresParaRecomendacao}
            />
          </div>
        )}

        {erro && <p className="v-erro">{erro}</p>}

        <input type="hidden" name="instrumentoId" value={instrumentoId} />
        <input type="hidden" name="professorId" value={professorId} />
        <input type="hidden" name="programa" value={programa} />
        <input type="hidden" name="idade" value={idade} />

        <div className="v-capsula">
          <span className="v-capsula-texto">
            <small>
              {escolhidos === 0
                ? 'Nenhum escolhido'
                : escolhidos === 1
                  ? '1 horário escolhido'
                  : `${escolhidos} horários escolhidos`}
            </small>
            <strong>Enviar pedido</strong>
          </span>
          <button type="submit" className="v-capsula-accao" disabled={aEnviar}>
            {aEnviar ? 'A enviar…' : 'Enviar'}
          </button>
        </div>
      </form>

      {avisoUmHorario && (
        <ModalUmHorario
          onEscolherMais={() => setAvisoUmHorario(false)}
          onEnviarAssim={() => {
            setAvisoUmHorario(false)
            abrirPopupDeConta()
          }}
        />
      )}

      {popup === 'conta' && (
        <ModalContaPedido
          onFechar={() => setPopup(null)}
          onConcluido={(alunoId) => {
            if (formRef.current) enviarPedido(alunoId, formRef.current)
          }}
        />
      )}

      {popup === 'aluno' && (
        <ModalEscolherAluno
          onFechar={() => setPopup(null)}
          onConcluido={(alunoId) => {
            if (formRef.current) enviarPedido(alunoId, formRef.current)
          }}
        />
      )}
    </>
  )
}
