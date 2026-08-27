'use client'

import { useState } from 'react'
import { classesCampo } from '@/components/campo-formulario'

export type ProfessorParaRecomendacao = { professor_id: string; nome: string }

// Programa de Recomendação, do lado de quem chega (Art. 9.º e 10.º).
//
// Só aparece quando o professor pedido aderiu ao Programa — quem não
// aderiu não suporta o benefício, e perguntar quem recomendou levaria a
// uma promessa que a escola depois não podia cumprir.
//
// A pergunta começa fechada, atrás de uma caixa de seleção, porque a
// esmagadora maioria dos pedidos não vem de recomendação nenhuma: dois
// campos sempre abertos no fim de um formulário longo leem-se como mais
// coisas obrigatórias a preencher.
//
// O nome é escrito à mão, e não escolhido de uma lista. Uma lista de
// alunos da escola diria a quem chega quem lá anda — exatamente o que o
// Art. 25.º manda não expor. O preço é a secretaria ter de confirmar à
// mão, que é o que o Programa já previa.
//
// O PROFESSOR, esse, escolhe-se de uma lista. Antes perguntava-se a
// modalidade por escrito ("piano"), o que servia só para a secretaria
// desempatar nomes repetidos — e deixava por dizer a regra que decide
// tudo: o Art. 8.º só admite recomendações dentro do mesmo professor.
// Escolher da lista faz a regra aparecer no momento em que é quebrada,
// em vez de a pessoa a descobrir dias depois pela secretaria.
export function CampoRecomendacao({
  professorId,
  professorNome,
  professores,
}: {
  // O professor a quem esta aula está a ser pedida — a única resposta
  // que faz a recomendação contar.
  professorId: string
  professorNome: string
  professores: ProfessorParaRecomendacao[]
}) {
  const [aberto, setAberto] = useState(false)
  const [escolhido, setEscolhido] = useState('')

  // Sem lista não há pergunta. Acontece se a função
  // professores_para_recomendacao ainda não existir na base de dados (a
  // migração 0056 é o que a cria): mais vale o Programa não aparecer
  // durante esse intervalo do que aparecer com um seletor vazio e
  // obrigatório, que travava o pedido de aula inteiro.
  if (professores.length === 0) return null

  const mesmoProfessor = escolhido !== '' && escolhido === professorId
  const outroProfessor = escolhido !== '' && escolhido !== professorId
  const nomeEscolhido = professores.find((p) => p.professor_id === escolhido)?.nome ?? ''

  return (
    <div className="recomendacao-bloco">
      <label className="recomendacao-pergunta">
        <input
          type="checkbox"
          checked={aberto}
          onChange={(e) => setAberto(e.target.checked)}
          className="h-[20px] w-[20px] shrink-0 accent-[var(--color-azul-fundo)]"
        />
        <span>Alguém da escola me recomendou este professor</span>
      </label>

      {aberto && (
        <div className="recomendacao-campos">
          <p className="recomendacao-nota">
            A secretaria confirma com essa pessoa antes de o benefício contar.
          </p>

          <div className="space-y-1">
            <label htmlFor="recomendadoPor" className="block text-[12.5px] font-medium">
              Nome de quem te recomendou
            </label>
            <input
              id="recomendadoPor"
              name="recomendadoPor"
              type="text"
              maxLength={120}
              autoComplete="off"
              placeholder="Ex: Maria Silva"
              required
              className={classesCampo}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="recomendadoProfessorId" className="block text-[12.5px] font-medium">
              Com que professor tem aulas essa pessoa?
            </label>
            <select
              id="recomendadoProfessorId"
              name="recomendadoProfessorId"
              value={escolhido}
              onChange={(e) => setEscolhido(e.target.value)}
              required
              className={classesCampo}
            >
              <option value="">Escolhe o professor</option>
              {professores.map((p) => (
                <option key={p.professor_id} value={p.professor_id}>
                  {p.nome}
                </option>
              ))}
            </select>

            {mesmoProfessor && (
              <p className="recomendacao-ajuda recomendacao-confirmado">
                Certo — é o professor deste pedido. A recomendação pode contar.
              </p>
            )}

            {/* Não trava o pedido: a aula pedida vale por si. O que se diz
                aqui é só que esta parte não vai a lado nenhum, para
                ninguém ficar à espera de um desconto que não vem. */}
            {outroProfessor && (
              <p className="recomendacao-aviso">
                O Programa de Recomendação só conta quando as duas pessoas têm aulas com o
                mesmo professor. Como {nomeEscolhido} não é {professorNome}, esta indicação
                não vai ser registada — o teu pedido de aula segue na mesma.
              </p>
            )}

            {!escolhido && (
              <p className="recomendacao-ajuda">
                Ajuda a secretaria a encontrar a pessoa certa.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
