'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { enviarMensagem, type EstadoMensagem } from '@/lib/actions/mensagens'
import { classesCampo, Rotulo } from '@/components/campo-formulario'
import { MensagemErro, MensagemInfo } from '@/components/mensagem'
import { SubmitButton } from '@/components/submit-button'

type Pessoa = { id: string; nome: string; sub: string }

export type ProfessorAlvo = Pessoa

export type AlunoAlvo = Pessoa & {
  // Um aluno com duas disciplinas tem dois professores e pode ter duas
  // escolas. É por isso que são listas: filtrar por professor tem de o
  // apanhar por qualquer uma delas.
  professores: string[]
  programas: string[]
}

const ESCOLAS = [
  { valor: 'musica', nome: 'Música' },
  { valor: 'danca', nome: 'Dança' },
  { valor: 'bebes', nome: 'Música para bebés' },
]

type Publico = 'alunos' | 'professores'
type Filtro = 'todos' | 'por_professor' | 'por_escola' | 'selecionados'

const INICIAL: EstadoMensagem = {}

// Escrever a uma sala inteira.
//
// O mesmo formulário serve a secretaria e os professores: o que muda é o
// que lhes é dado escolher. Um professor recebe `admin=false`, só vê os
// seus alunos e assina sempre — quem decide isso a sério é a base de
// dados, aqui é só não mostrar portas que estão trancadas do outro lado.
//
// A contagem ("vai para 34 alunos") é feita cá, a partir da lista que já
// veio do servidor. Não é o número de notificações — uma família com dois
// filhos recebe uma só — e por isso é sempre dito em alunos, nunca em
// pessoas. O número exato aparece depois de enviar, vindo da base.
export function MensagemEscolaForm({
  admin,
  nomeAutor,
  professores,
  alunos,
}: {
  admin: boolean
  nomeAutor: string
  professores: ProfessorAlvo[]
  alunos: AlunoAlvo[]
}) {
  const [estado, acao] = useActionState(enviarMensagem, INICIAL)

  const [publico, setPublico] = useState<Publico>('alunos')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [programa, setPrograma] = useState('musica')
  const [profsEscolhidos, setProfsEscolhidos] = useState<string[]>([])
  const [alunosEscolhidos, setAlunosEscolhidos] = useState<string[]>([])
  const [semNome, setSemNome] = useState(false)
  const [assinatura, setAssinatura] = useState(nomeAutor)
  const [corpo, setCorpo] = useState('')
  const [termo, setTermo] = useState('')

  // Depois de enviar, a folha fica limpa. Sem isto, o texto que já saiu
  // continua no ecrã e convida a carregar outra vez — e a segunda vez
  // envia mesmo.
  useEffect(() => {
    if (estado.enviadas !== undefined) {
      setCorpo('')
      setAlunosEscolhidos([])
      setProfsEscolhidos([])
      setTermo('')
    }
  }, [estado])

  // Trocar de público sem repor o filtro deixava "por escola" escolhido
  // com os professores à frente — um estado que a base de dados recusa.
  function mudarPublico(novo: Publico) {
    setPublico(novo)
    setFiltro('todos')
    setTermo('')
  }

  const filtrosDisponiveis: { valor: Filtro; nome: string }[] =
    publico === 'professores'
      ? [
          { valor: 'todos', nome: 'Todos os professores' },
          { valor: 'selecionados', nome: 'Escolher professores' },
        ]
      : admin
        ? [
            { valor: 'todos', nome: 'Todos os alunos' },
            { valor: 'por_professor', nome: 'Por professor' },
            { valor: 'por_escola', nome: 'Por escola' },
            { valor: 'selecionados', nome: 'Escolher alunos' },
          ]
        : [
            { valor: 'todos', nome: 'Todos os meus alunos' },
            { valor: 'selecionados', nome: 'Escolher alunos' },
          ]

  const quantos = useMemo(() => {
    if (publico === 'professores') {
      return filtro === 'todos' ? professores.length : profsEscolhidos.length
    }
    if (filtro === 'todos') return alunos.length
    if (filtro === 'selecionados') return alunosEscolhidos.length
    if (filtro === 'por_escola') {
      return alunos.filter((a) => a.programas.includes(programa)).length
    }
    return alunos.filter((a) => a.professores.some((p) => profsEscolhidos.includes(p))).length
  }, [publico, filtro, alunos, professores, alunosEscolhidos, profsEscolhidos, programa])

  const alvo = publico === 'professores' ? 'professor' : 'aluno'

  // A lista onde se escolhe pessoa a pessoa. A pesquisa esconde linhas,
  // por isso o que está escolhido vive no estado e não nas checkboxes —
  // uma checkbox que sai do ecrã levava a escolha com ela.
  // Uma forma comum às duas listas: a partir daqui só interessa id,
  // nome e a linha de baixo — e um `ProfessorAlvo[] | AlunoAlvo[]` não
  // se percorre sem o TypeScript reclamar.
  const lista: Pessoa[] = publico === 'professores' ? professores : alunos
  const escolhidos = publico === 'professores' ? profsEscolhidos : alunosEscolhidos
  const alternar = (id: string) => {
    const mexer = publico === 'professores' ? setProfsEscolhidos : setAlunosEscolhidos
    mexer((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]))
  }

  const termoLimpo = termo.trim().toLowerCase()
  const visiveis =
    termoLimpo === '' ? lista : lista.filter((p) => p.nome.toLowerCase().includes(termoLimpo))

  const mostraEscolha =
    filtro === 'selecionados' || (publico === 'alunos' && filtro === 'por_professor')
  // Escolher "por professor" é escolher da lista de professores, mesmo
  // estando a mandar para alunos.
  const listaDaEscolha: Pessoa[] = filtro === 'por_professor' ? professores : visiveis
  const escolhidosDaEscolha = filtro === 'por_professor' ? profsEscolhidos : escolhidos
  const alternarDaEscolha =
    filtro === 'por_professor'
      ? (id: string) =>
          setProfsEscolhidos((atual) =>
            atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
          )
      : alternar

  const nomeCampoOculto =
    filtro === 'por_professor' || publico === 'professores' ? 'professores' : 'alunos'
  const idsOcultos = filtro === 'por_professor' ? profsEscolhidos : escolhidos

  return (
    <form action={acao} className="space-y-7">
      <input type="hidden" name="publico" value={publico} />
      <input type="hidden" name="filtro" value={filtro} />
      {filtro === 'por_escola' && <input type="hidden" name="programa" value={programa} />}
      {mostraEscolha &&
        idsOcultos.map((id) => (
          <input key={id} type="hidden" name={nomeCampoOculto} value={id} />
        ))}

      {admin && (
        <fieldset className="space-y-[10px]">
          <legend className="mensagem-legenda">Para quem</legend>
          <div className="mensagem-opcoes">
            {(['alunos', 'professores'] as Publico[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => mudarPublico(v)}
                aria-pressed={publico === v}
                className="mensagem-opcao"
              >
                {v === 'alunos' ? 'Alunos' : 'Professores'}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-[10px]">
        <legend className="mensagem-legenda">Quais</legend>
        <div className="mensagem-opcoes">
          {filtrosDisponiveis.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => {
                setFiltro(f.valor)
                setTermo('')
              }}
              aria-pressed={filtro === f.valor}
              className="mensagem-opcao"
            >
              {f.nome}
            </button>
          ))}
        </div>
      </fieldset>

      {filtro === 'por_escola' && (
        <fieldset className="space-y-[10px]">
          <legend className="mensagem-legenda">Escola</legend>
          <div className="mensagem-opcoes">
            {ESCOLAS.map((e) => (
              <button
                key={e.valor}
                type="button"
                onClick={() => setPrograma(e.valor)}
                aria-pressed={programa === e.valor}
                className="mensagem-opcao"
              >
                {e.nome}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {mostraEscolha && (
        <div className="space-y-[10px]">
          <p className="mensagem-legenda">
            {filtro === 'por_professor' ? 'Professores' : `Escolhe quem recebe`}
          </p>

          {filtro !== 'por_professor' && lista.length > 6 && (
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
                placeholder="Pesquisar por nome…"
                aria-label="Pesquisar por nome"
                className={`${classesCampo} pl-[40px]`}
              />
            </div>
          )}

          {listaDaEscolha.length === 0 ? (
            <MensagemInfo>Não há ninguém nesta lista.</MensagemInfo>
          ) : (
            <div className="mensagem-escolha">
              {listaDaEscolha.map((p) => (
                <label key={p.id} className="mensagem-escolha-linha">
                  <input
                    type="checkbox"
                    checked={escolhidosDaEscolha.includes(p.id)}
                    onChange={() => alternarDaEscolha(p.id)}
                  />
                  <span>
                    <span className="lista-item-titulo block">{p.nome}</span>
                    {p.sub && <span className="lista-item-sub">{p.sub}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-[10px]">
        <Rotulo htmlFor="assinatura">Assinatura</Rotulo>
        <input
          id="assinatura"
          name="assinatura"
          value={assinatura}
          onChange={(e) => setAssinatura(e.target.value)}
          disabled={semNome}
          maxLength={120}
          placeholder="Presidente da Direção Daniel Lucas"
          className={`${classesCampo} disabled:opacity-40`}
        />
        <p className="text-[12.5px] leading-[1.5]" style={{ color: 'var(--color-tinta-suave)' }}>
          É o que aparece por cima da mensagem, e é o título da notificação no telemóvel.
        </p>

        {/* Sem nome é da secretaria. Um professor a escrever sem nome
            para um aluno seu parecia estar a falar em nome da direção. */}
        {admin && (
          <label className="mensagem-sem-nome">
            <input
              type="checkbox"
              name="semNome"
              checked={semNome}
              onChange={(e) => setSemNome(e.target.checked)}
            />
            <span>Enviar sem nome — aparece só &quot;Mensagem da escola&quot;</span>
          </label>
        )}
      </div>

      <div className="space-y-[6px]">
        <Rotulo htmlFor="corpo">Mensagem</Rotulo>
        <textarea
          id="corpo"
          name="corpo"
          rows={5}
          maxLength={1000}
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          placeholder="Escreve aqui. Quem recebe lê — não consegue responder."
          className={`${classesCampo} h-auto py-[12px] leading-[1.5]`}
        />
        <p className="text-[12.5px]" style={{ color: 'var(--color-tinta-suave)' }}>
          {corpo.length}/1000
        </p>
      </div>

      <div className="mensagem-previsao" aria-live="polite">
        <p className="mensagem-previsao-etiqueta">Como vai aparecer</p>
        <strong>{semNome ? 'Mensagem da escola' : assinatura.trim() || 'Mensagem da escola'}</strong>
        <p>{corpo.trim() || 'A mensagem aparece aqui.'}</p>
      </div>

      {estado.erro && <MensagemErro>{estado.erro}</MensagemErro>}
      {estado.enviadas !== undefined && (
        <MensagemInfo>
          {estado.enviadas === 0
            ? 'Não havia ninguém para receber esta mensagem.'
            : `Mensagem enviada a ${estado.enviadas} ${estado.enviadas === 1 ? 'pessoa' : 'pessoas'}.`}
        </MensagemInfo>
      )}

      <SubmitButton
        textoAGuardar="A enviar…"
        disabled={corpo.trim() === '' || quantos === 0}
        className="mensagem-enviar"
      >
        Enviar a {quantos} {quantos === 1 ? alvo : `${alvo}s`}
      </SubmitButton>
    </form>
  )
}
