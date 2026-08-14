'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'
import { BottomSheet } from '@/components/bottom-sheet'
import { BotaoPrimario } from '@/components/botao-primario'
import { classesCampo } from '@/components/campo-formulario'

// Popup que pede a idade do futuro aluno antes de mostrar as disciplinas —
// só serve para filtrar/ordenar os cartões (azul = adequado, cinza =
// não), a idade real só fica gravada quando o perfil de aluno é criado
// mais tarde. Acrescenta "idade" à URL atual, seguindo o mesmo padrão dos
// outros passos do wizard (estado guardado nos searchParams, não em React).
export function SeletorIdade() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [idade, setIdade] = useState(8)

  function confirmar() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('idade', String(idade))
    // "replace" e não "push": o pop-up é um passo de entrada, não um sítio
    // a que se volta. Substituindo a entrada no histórico, voltar atrás a
    // partir das disciplinas leva à página inicial em vez de o mostrar
    // outra vez — que era o que prendia a pessoa no wizard.
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Sem onFechar: este passo não é dispensável — sem idade não há
  // disciplinas para mostrar. Fechar equivaleria a um ecrã vazio.
  return (
    <BottomSheet titulo="Que idade tem o futuro aluno?">
      <div className="space-y-[14px]">
        <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--color-text-secondary)' }}>
          Só para te mostrarmos as disciplinas certas para essa idade.
        </p>
        <select
          value={idade}
          onChange={(e) => setIdade(Number(e.target.value))}
          aria-label="Idade do futuro aluno"
          className={`${classesCampo} text-center`}
        >
          {Array.from({ length: 100 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'ano' : 'anos'}
            </option>
          ))}
        </select>
        <BotaoPrimario onClick={confirmar}>Continuar</BotaoPrimario>
      </div>
    </BottomSheet>
  )
}
