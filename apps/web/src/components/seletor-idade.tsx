'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'

// Passo da idade do futuro aluno, antes de mostrar as disciplinas — só
// serve para filtrar/ordenar os cartões (as adequadas primeiro, as que
// não servem esbatidas); a idade real só fica gravada quando o perfil de
// aluno é criado mais tarde. Acrescenta "idade" à URL atual, seguindo o
// mesmo padrão dos outros passos do wizard (estado nos searchParams, não
// em React).
//
// Era um bottom sheet por cima do ecrã. Passou a ser o ecrã: o design
// vitrine não usa folhas deslizantes, e este passo não é um aparte — é
// uma das cinco perguntas do percurso, e a barra de progresso já o diz.
export function SeletorIdade() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [idade, setIdade] = useState(8)

  function confirmar() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('idade', String(idade))
    // "replace" e não "push": este passo é uma entrada, não um sítio a
    // que se volta. Substituindo a entrada no histórico, voltar atrás a
    // partir das disciplinas leva à página inicial em vez de o mostrar
    // outra vez — que era o que prendia a pessoa no wizard.
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      <div className="v-campos">
        <label className="v-campo" htmlFor="idade">
          <span>Idade</span>
          <select
            id="idade"
            value={idade}
            onChange={(e) => setIdade(Number(e.target.value))}
            style={{ textAlign: 'center', fontSize: '18px', fontWeight: 600 }}
          >
            {Array.from({ length: 100 }, (_, i) => i).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'ano' : 'anos'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="v-capsula">
        <span className="v-ponto" aria-hidden="true" />
        <span className="v-capsula-texto">
          <small className="v-capsula-etiqueta">Idade</small>
          <strong style={{ fontWeight: 500, fontSize: '14.5px' }}>
            {idade} {idade === 1 ? 'ano' : 'anos'}
          </strong>
        </span>
        <button type="button" onClick={confirmar} className="v-capsula-accao">
          Continuar
        </button>
      </div>
    </>
  )
}
