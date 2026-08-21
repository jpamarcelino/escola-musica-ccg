'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { publicarPartitura, type EstadoPartitura } from '@/lib/actions/materiais'
import { SeletorAlunos, type AlunoEscolhivel } from '@/components/seletor-alunos'
import { classesCampo, Rotulo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { SubmitButton } from '@/components/submit-button'

const INICIAL: EstadoPartitura = {}

// 20 MB. O bucket recusa acima disso (0049), mas dizê-lo aqui poupa ao
// professor esperar por um carregamento que vai falhar no fim.
const MAXIMO = 20 * 1024 * 1024

function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export function EnviarPartituraForm({ alunos }: { alunos: AlunoEscolhivel[] }) {
  const [estado, enviar] = useActionState(publicarPartitura, INICIAL)

  const [ficheiro, setFicheiro] = useState<{
    caminho: string
    nome: string
    bytes: number
  } | null>(null)
  const [aCarregar, setACarregar] = useState(false)
  const [erroFicheiro, setErroFicheiro] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [escolhidos, setEscolhidos] = useState<string[]>([])
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (estado.enviadoA !== undefined) {
      setFicheiro(null)
      setTitulo('')
      setDescricao('')
      setEscolhidos([])
      if (campo.current) campo.current.value = ''
    }
  }, [estado])

  async function escolherFicheiro(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    setErroFicheiro(null)

    if (f.type !== 'application/pdf') {
      setErroFicheiro('A partitura tem de ser um PDF.')
      e.target.value = ''
      return
    }
    if (f.size > MAXIMO) {
      setErroFicheiro(`O ficheiro tem ${tamanhoLegivel(f.size)} e o limite é 20 MB.`)
      e.target.value = ''
      return
    }

    setACarregar(true)

    // O ficheiro vai daqui direto para a Supabase. A policy do Storage só
    // aceita ficheiros na pasta de quem está autenticado — daí o id do
    // professor à cabeça do caminho.
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setErroFicheiro('Sessão expirada. Entra outra vez.')
      setACarregar(false)
      return
    }

    const caminho = `${user.id}/${crypto.randomUUID()}.pdf`
    const { error } = await supabase.storage
      .from('partituras')
      .upload(caminho, f, { contentType: 'application/pdf' })

    setACarregar(false)

    if (error) {
      setErroFicheiro('Não foi possível carregar o ficheiro. Tenta outra vez.')
      return
    }

    setFicheiro({ caminho, nome: f.name, bytes: f.size })
    // O nome do ficheiro serve de título de partida — quase sempre já é o
    // nome da peça, e o professor só tem de o limpar.
    if (titulo === '') setTitulo(f.name.replace(/\.pdf$/i, '').slice(0, 160))
  }

  if (alunos.length === 0) {
    return (
      <MensagemInfo>
        Ainda não tens alunos com aulas a decorrer. O material vai para quem já anda nas tuas
        aulas.
      </MensagemInfo>
    )
  }

  return (
    <div className="space-y-7">
      {estado.enviadoA !== undefined && (
        <MensagemInfo>
          Enviada a {estado.enviadoA} {estado.enviadoA === 1 ? 'aluno' : 'alunos'}. Já está no
          caderno {estado.enviadoA === 1 ? 'dele' : 'deles'}.
        </MensagemInfo>
      )}

      <div className="space-y-[10px]">
        <Rotulo htmlFor="partitura">Ficheiro PDF</Rotulo>
        <input
          ref={campo}
          id="partitura"
          type="file"
          accept="application/pdf"
          onChange={escolherFicheiro}
          disabled={aCarregar}
          className={classesCampo}
        />
        <p className="material-ajuda">
          Só PDF, até 20 MB. O ficheiro fica guardado na escola — só o veem os alunos a quem o
          enviares.
        </p>
        {aCarregar && <MensagemInfo>A carregar o ficheiro…</MensagemInfo>}
        {erroFicheiro && <MensagemErro>{erroFicheiro}</MensagemErro>}
      </div>

      {ficheiro && (
        <form action={enviar} className="space-y-7">
          <input type="hidden" name="ficheiro" value={ficheiro.caminho} />
          <input type="hidden" name="ficheiroNome" value={ficheiro.nome} />
          <input type="hidden" name="ficheiroBytes" value={ficheiro.bytes} />

          <div className="material-previsao material-previsao-pdf">
            <span aria-hidden="true">
              <FileText size={26} strokeWidth={1.5} />
            </span>
            <div>
              <small>Carregado · {tamanhoLegivel(ficheiro.bytes)}</small>
              <strong>{ficheiro.nome}</strong>
            </div>
          </div>

          <div className="space-y-[10px]">
            <Rotulo htmlFor="titulo-partitura">Título</Rotulo>
            <input
              id="titulo-partitura"
              name="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={classesCampo}
              maxLength={160}
              required
            />
          </div>

          <div className="space-y-[10px]">
            <Rotulo htmlFor="descricao-partitura">Descrição (opcional)</Rotulo>
            <textarea
              id="descricao-partitura"
              name="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={classesCampo}
              maxLength={600}
              rows={3}
              placeholder="Que compassos estudar, a que andamento…"
            />
          </div>

          <fieldset className="space-y-[10px]">
            <legend className="mensagem-legenda">Para quem</legend>
            <SeletorAlunos alunos={alunos} escolhidos={escolhidos} aoMudar={setEscolhidos} />
          </fieldset>

          {estado.erro && <MensagemErro>{estado.erro}</MensagemErro>}

          <SubmitButton textoAGuardar="A enviar…" className="recomendacao-submeter">
            {escolhidos.length === 0
              ? 'Enviar partitura'
              : `Enviar a ${escolhidos.length} ${escolhidos.length === 1 ? 'aluno' : 'alunos'}`}
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
