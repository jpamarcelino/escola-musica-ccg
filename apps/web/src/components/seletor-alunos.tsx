'use client'

import { useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

export type AlunoEscolhivel = { id: string; nome: string; sub: string }

// Escolher alunos um a um, por pesquisa.
//
// Não é uma lista com caixas de marcar: com trinta alunos, essa lista
// obriga a percorrer o ecrã inteiro para encontrar dois nomes. Aqui
// escreve-se o nome, escolhe-se, e o nome passa a uma etiqueta em cima —
// visível e apagável, para se ver a qualquer momento a quem é que aquilo
// vai. É o padrão de quem endereça um email.
//
// Quem já está escolhido desaparece dos resultados: oferecer outra vez
// alguém que já lá está só dá para enganar.
export function SeletorAlunos({
  alunos,
  escolhidos,
  aoMudar,
}: {
  alunos: AlunoEscolhivel[]
  escolhidos: string[]
  aoMudar: (ids: string[]) => void
}) {
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  const porId = useMemo(() => new Map(alunos.map((a) => [a.id, a])), [alunos])

  const resultados = useMemo(() => {
    const limpo = termo.trim().toLowerCase()
    const disponiveis = alunos.filter((a) => !escolhidos.includes(a.id))
    if (limpo === '') return disponiveis
    return disponiveis.filter((a) => a.nome.toLowerCase().includes(limpo))
  }, [alunos, escolhidos, termo])

  function escolher(id: string) {
    aoMudar([...escolhidos, id])
    // A barra fecha e limpa-se: quem quiser outro volta a escrever, e não
    // fica com o nome do anterior a atrapalhar a procura seguinte.
    setTermo('')
    setAberto(false)
  }

  function remover(id: string) {
    aoMudar(escolhidos.filter((x) => x !== id))
  }

  const todosEscolhidos = escolhidos.length === alunos.length && alunos.length > 0

  return (
    <div className="seletor-alunos">
      <div className="seletor-alunos-topo">
        <div className="seletor-alunos-campo">
          <Search size={16} aria-hidden="true" />
          <input
            ref={campo}
            type="text"
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value)
              setAberto(true)
            }}
            onFocus={() => setAberto(true)}
            // O clique num resultado tira o foco do campo antes do
            // onClick correr. Sem este adiamento, a lista fechava e a
            // escolha nunca chegava a acontecer.
            onBlur={() => window.setTimeout(() => setAberto(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAberto(false)
                setTermo('')
              }
              // Enter com um único resultado escolhe-o: quem escreveu o
              // nome inteiro não devia ter de tirar a mão do teclado.
              if (e.key === 'Enter') {
                e.preventDefault()
                if (aberto && resultados.length === 1) escolher(resultados[0].id)
              }
            }}
            placeholder="Escrever o nome do aluno…"
            aria-label="Procurar aluno"
            aria-expanded={aberto}
            aria-controls="seletor-alunos-resultados"
            role="combobox"
            autoComplete="off"
          />
        </div>

        {alunos.length > 1 && (
          <button
            type="button"
            className="seletor-alunos-todos"
            onClick={() => aoMudar(todosEscolhidos ? [] : alunos.map((a) => a.id))}
          >
            {todosEscolhidos ? 'Desselecionar todos' : 'Selecionar todos'}
          </button>
        )}
      </div>

      {aberto && (
        <ul className="seletor-alunos-resultados" id="seletor-alunos-resultados" role="listbox">
          {resultados.length === 0 ? (
            <li className="seletor-alunos-vazio">
              {escolhidos.length === alunos.length
                ? 'Já escolheste todos.'
                : 'Nenhum aluno com esse nome.'}
            </li>
          ) : (
            resultados.slice(0, 8).map((a) => (
              <li key={a.id}>
                <button type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(a.id)}>
                  <strong>{a.nome}</strong>
                  {a.sub && <small>{a.sub}</small>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {/* A quem vai. Fica sempre visível — é a única forma de o professor
          confirmar o destino antes de enviar. */}
      <div className="seletor-alunos-escolhidos" aria-live="polite">
        {escolhidos.length === 0 ? (
          <p className="seletor-alunos-nenhum">Ainda não escolheste ninguém.</p>
        ) : (
          escolhidos.map((id) => (
            <span key={id} className="seletor-aluno-etiqueta">
              {porId.get(id)?.nome ?? 'Aluno'}
              <button
                type="button"
                onClick={() => remover(id)}
                aria-label={`Retirar ${porId.get(id)?.nome ?? 'aluno'}`}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))
        )}
      </div>

      {escolhidos.map((id) => (
        <input key={id} type="hidden" name="alunos" value={id} />
      ))}
    </div>
  )
}
