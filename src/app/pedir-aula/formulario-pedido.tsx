'use client'

import { useRef, useState, useTransition, type CSSProperties } from 'react'
import { escolherDisponibilidades } from '@/lib/actions/aluno'
import { HOUR_HEIGHT, paraMinutos, formatarHora } from '@/lib/horarios-grade'
import { ModalContaPedido, ModalEscolherAluno } from '@/components/modal-conta-pedido'

type Horario = {
  id: number
  dia_semana: string
  hora_inicio: string
  hora_fim: string
  estado: string
}

// Passo final do wizard público (/pedir-aula): a mesma grelha de horários +
// mensagem do fluxo autenticado, mas o "Enviar pedido" não faz um POST
// direto — primeiro garante que há sessão e um aluno escolhido (mostrando
// o popup de conta só se for preciso), e só depois envia o pedido a
// sério. Os checkboxes/textarea ficam sempre montados por trás do popup,
// por isso nada do que já foi escolhido se perde.
export function FormularioPedido({
  diasGrade,
  horariosPorDia,
  horas,
  horaInicioGrade,
  alturaGrade,
  semHorarios,
  instrumentoId,
  professorId,
  autenticado,
  erroInicial,
}: {
  diasGrade: string[]
  horariosPorDia: Record<string, Horario[]>
  horas: number[]
  horaInicioGrade: number
  alturaGrade: number
  semHorarios: boolean
  instrumentoId: string
  professorId: string
  autenticado: boolean
  erroInicial?: string
}) {
  const [popup, setPopup] = useState<'conta' | 'aluno' | null>(null)
  const [aEnviar, iniciarEnvio] = useTransition()
  const [erro, setErro] = useState(erroInicial ?? '')
  const formRef = useRef<HTMLFormElement>(null)

  let indiceAtual = 0

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

  function aoSubmeter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    const formEl = e.currentTarget
    const horariosEscolhidos = formEl.querySelectorAll('input[name="horarios"]:checked')
    const mensagem = (formEl.elements.namedItem('mensagem') as HTMLTextAreaElement)?.value.trim()
    if (horariosEscolhidos.length === 0 && !mensagem) {
      setErro('Seleciona pelo menos um horário ou escreve uma mensagem.')
      return
    }
    setPopup(autenticado ? 'aluno' : 'conta')
  }

  return (
    <>
      <form ref={formRef} onSubmit={aoSubmeter} className="space-y-4">
        {semHorarios ? (
          <p className="text-sm text-foreground/60">
            Este professor ainda não tem horários disponíveis. Podes deixar-lhe
            uma mensagem em baixo.
          </p>
        ) : (
          <>
            <p className="text-xs text-foreground/50">
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
              {diasGrade.map((dia) => (
                <div key={dia} className="horarios-coluna-dia">
                  <div className="horarios-coluna-dia-cabecalho">{dia.slice(0, 3)}</div>
                  <div
                    className="horarios-coluna-dia-corpo"
                    style={{
                      height: alturaGrade,
                      backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.08) 0, rgba(0,0,0,0.08) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
                    }}
                  >
                    {(horariosPorDia[dia] ?? []).map((h) => {
                      const inicioMin = paraMinutos(h.hora_inicio)
                      const fimMin = paraMinutos(h.hora_fim)
                      const estilo = {
                        top: ((inicioMin - horaInicioGrade * 60) / 60) * HOUR_HEIGHT,
                        height: ((fimMin - inicioMin) / 60) * HOUR_HEIGHT,
                        '--card-index': indiceAtual++,
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
                        <label key={h.id} className="horario-bloco entrada-esquerda" style={estilo}>
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

        <div className="space-y-1">
          <label htmlFor="mensagem" className="block text-sm font-medium">
            Nenhum horário dá jeito?
          </label>
          <textarea
            id="mensagem"
            name="mensagem"
            rows={3}
            maxLength={500}
            placeholder="Ex: só posso às quintas-feiras a partir das 16h — achas que dá para arranjar?"
            className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-foreground/50">
            Deixa uma mensagem ao professor em vez de escolher um horário. Ele
            decide se quer entrar em contacto fora da app.
          </p>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button
          type="submit"
          disabled={aEnviar}
          className="w-full rounded bg-brand text-white hover:bg-brand-hover py-2 disabled:opacity-50"
        >
          {aEnviar ? 'A enviar...' : 'Enviar pedido'}
        </button>
        {/* Campos ocultos só para dar contexto ao FormData reconstruído em
            enviarPedido — o alunoId real é preenchido só depois do popup. */}
        <input type="hidden" name="instrumentoId" value={instrumentoId} />
        <input type="hidden" name="professorId" value={professorId} />
      </form>

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
