'use client'

import { useState } from 'react'
import { classesCampo } from '@/components/campo-formulario'

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
export function CampoRecomendacao() {
  const [aberto, setAberto] = useState(false)

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
              className={classesCampo}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="recomendadoModalidade" className="block text-[12.5px] font-medium">
              Que aulas tem essa pessoa? <span className="recomendacao-opcional">(opcional)</span>
            </label>
            <input
              id="recomendadoModalidade"
              name="recomendadoModalidade"
              type="text"
              maxLength={80}
              autoComplete="off"
              placeholder="Ex: piano"
              className={classesCampo}
            />
            {/* Serve para desempatar nomes repetidos — numa escola há mais
                do que uma Maria, e a secretaria precisa de saber qual. */}
            <p className="recomendacao-ajuda">Ajuda a secretaria a encontrar a pessoa certa.</p>
          </div>
        </div>
      )}
    </div>
  )
}
