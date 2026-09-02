'use client'

import { useState } from 'react'
import { SubmitButton } from '@/components/submit-button'
import { BellRing, Check, UserX } from 'lucide-react'

type AlunoChamada = {
  id: number
  nome: string
  instrumento: string | null
}

const ESTADOS = [
  { valor: 'presente', label: 'Presente', ajuda: 'Veio à aula', Icone: Check },
  { valor: 'falta_aviso', label: 'Falta avisada', ajuda: 'Avisou antes', Icone: BellRing },
  { valor: 'falta_sem_aviso', label: 'Sem aviso', ajuda: 'Não avisou', Icone: UserX },
] as const

export function PresencasChamadaForm({
  action,
  horarioId,
  data,
  alunos,
  estadosIniciais,
}: {
  action: (formData: FormData) => void | Promise<void>
  horarioId: string
  data: string
  alunos: AlunoChamada[]
  estadosIniciais: Record<number, string>
}) {
  const [estados, setEstados] = useState(estadosIniciais)
  const preenchidos = alunos.filter((aluno) => Boolean(estados[aluno.id])).length
  const completo = preenchidos === alunos.length

  return (
    <form action={action} className="presencas-chamada">
      <input type="hidden" name="horarioId" value={horarioId} />
      <input type="hidden" name="data" value={data} />

      <div className="presencas-progresso" data-completo={completo} aria-live="polite">
        <div>
          <span><strong>{preenchidos}</strong> de {alunos.length} alunos</span>
          <span aria-hidden="true">{completo ? 'Chamada completa' : 'Escolhe um estado para cada aluno'}</span>
        </div>
        <div className="presencas-progresso-bar" aria-hidden="true"><span style={{ width: `${alunos.length ? (preenchidos / alunos.length) * 100 : 0}%` }} /></div>
      </div>

      <div className="presencas-chamada-lista">
        {alunos.map((aluno) => (
          <fieldset
            key={aluno.id}
            className="presencas-aluno-chamada"
            data-preenchido={Boolean(estados[aluno.id])}
          >
            <legend>
              <strong>{aluno.nome}</strong>
              {aluno.instrumento && <small>{aluno.instrumento}</small>}
            </legend>
            <div className="presencas-estados">
              {ESTADOS.map((estado) => (
                <label key={estado.valor} data-estado={estado.valor}>
                  <input
                    type="radio"
                    name={`estado_${aluno.id}`}
                    value={estado.valor}
                    checked={estados[aluno.id] === estado.valor}
                    onChange={() => setEstados((atuais) => ({
                      ...atuais,
                      [aluno.id]: estado.valor,
                    }))}
                  />
                  <estado.Icone size={19} strokeWidth={2} aria-hidden="true" />
                  <span><strong>{estado.label}</strong><small>{estado.ajuda}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <SubmitButton
        textoAGuardar="A guardar…"
        className="presencas-guardar"
        disabled={!completo}
      >
        {completo ? 'Guardar presenças' : `Faltam ${alunos.length - preenchidos}`}
      </SubmitButton>
    </form>
  )
}
