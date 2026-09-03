'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { LinhaLista, GrupoLista } from '@/components/lista'
import { EmptyState } from '@/components/empty-state'
import { classesCampo } from '@/components/campo-formulario'

// Pesquisa por nome, só no cliente (a lista já vem inteira do servidor) —
// simples de propósito, sem chamada nova à BD. Serve para as listas que
// podem crescer com o tempo (alunos, professores); esconde-se sozinha
// quando a lista é curta o suficiente para não precisar dela.
export function ListaComPesquisa({
  itens,
  hrefPrefix,
  hrefSuffix = '',
  placeholder = 'Pesquisar por nome…',
}: {
  itens: { id: string; nome: string }[]
  // Prefixo do link (ex: "/admin/alunos/") — concatenado com o id aqui
  // dentro, em vez de receber uma função: um Server Component não pode
  // passar funções como prop a um Client Component.
  hrefPrefix: string
  hrefSuffix?: string
  placeholder?: string
}) {
  const [termo, setTermo] = useState('')
  const termoLimpo = termo.trim().toLowerCase()
  const filtrados =
    termoLimpo === '' ? itens : itens.filter((i) => i.nome.toLowerCase().includes(termoLimpo))

  return (
    <div className="lista-pesquisa space-y-[14px]">
      {itens.length > 6 && (
        <div className="relative">
          <Search
            aria-hidden="true"
            size={17}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-tinta-suave)' }}
          />
          <input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className={`${classesCampo} pl-[40px]`}
          />
        </div>
      )}

      <p className="sr-only" aria-live="polite">{filtrados.length} {filtrados.length === 1 ? 'resultado' : 'resultados'}</p>
      <div key={termoLimpo} className="motion-results">
      {filtrados.length === 0 ? (
        <EmptyState
          titulo="Sem resultados"
          descricao={`Não encontrámos ninguém com "${termo.trim()}".`}
        />
      ) : (
        <GrupoLista>
          {filtrados.map((item) => (
            <LinhaLista
              key={item.id}
              href={`${hrefPrefix}${item.id}${hrefSuffix}`}
              titulo={item.nome}
            />
          ))}
        </GrupoLista>
      )}</div>
    </div>
  )
}
