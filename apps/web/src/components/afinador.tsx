'use client'

// O ecrã do afinador. Só apresentação e controlos: a análise está em
// @ccg/core, a captação em lib/afinador/microfone e o ciclo de vida no
// usar-afinador. Aqui não há uma linha de processamento de sinal.

import { useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import {
  A4_MAX,
  A4_MIN,
  A4_PADRAO,
  CENTS_AFINADO,
  CENTS_ESCALA,
  afinacaoRelativa,
  direcaoDaAfinacao,
  textoDaDirecao,
  TEXTOS_LEGAIS,
} from '@ccg/core'
import type { Acidente, SaidaAfinador } from '@ccg/core'
import { BotaoPrimario } from '@/components/botao-primario'
import { useAfinador } from '@/lib/afinador/use-afinador'
import type { ErroMicrofone } from '@/lib/afinador/microfone'

const ACIDENTES: { id: Acidente; nome: string; exemplo: string }[] = [
  { id: 'sustenidos', nome: 'Sustenidos', exemplo: 'Dó♯' },
  { id: 'bemois', nome: 'Bemóis', exemplo: 'Ré♭' },
]

// Cada falha tem a sua saída. "Não consegui aceder ao microfone" para
// tudo mandava a pessoa tentar outra vez o que nunca ia funcionar —
// autorizar nas definições e fechar a app que está a ocupar o microfone
// são coisas diferentes.
const EXPLICACAO: Record<ErroMicrofone, string> = {
  'sem-suporte':
    'Este browser não permite aceder ao microfone. Experimenta o Chrome, o Safari ou o Firefox atualizados.',
  'contexto-inseguro':
    'O afinador precisa de uma ligação segura. Abre a app pelo endereço oficial, começado por https.',
  recusada: 'Não foi dada autorização ao microfone. Carrega em Iniciar e escolhe “Permitir”.',
  bloqueada:
    'O microfone está bloqueado para este site. Autoriza-o nas definições do browser — no telemóvel, no ícone à esquerda do endereço; no computador, no cadeado da barra de endereço.',
  'sem-microfone': 'Não foi encontrado nenhum microfone ligado a este dispositivo.',
  ocupado:
    'O microfone está a ser usado por outra aplicação. Fecha-a — ou termina a chamada — e tenta de novo.',
  desconhecido: 'Não foi possível aceder ao microfone.',
}

// A agulha. SVG e não uma barra com transform porque as marcas da escala
// têm de estar desenhadas: sem elas, "afinado" fica a depender só da cor.
function Agulha({ cents, afinado }: { cents: number; afinado: boolean }) {
  const limitado = Math.max(-CENTS_ESCALA, Math.min(CENTS_ESCALA, cents))
  const largura = 300
  const meio = largura / 2
  const alcance = 130
  const x = meio + (limitado / CENTS_ESCALA) * alcance
  const cor = afinado ? 'var(--color-positive)' : 'var(--color-tinta-suave)'

  return (
    <svg viewBox="0 0 300 78" className="w-full" aria-hidden="true">
      {/* Faixa da tolerância: mostra o quão apertado é o "afinado". */}
      <rect
        x={meio - (CENTS_AFINADO / CENTS_ESCALA) * alcance}
        y={26}
        width={(2 * CENTS_AFINADO / CENTS_ESCALA) * alcance}
        height={26}
        rx={3}
        fill="var(--color-positive)"
        opacity={afinado ? 0.22 : 0.1}
      />
      {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((c) => {
        const tx = meio + (c / CENTS_ESCALA) * alcance
        const central = c === 0
        return (
          <g key={c}>
            <rect
              x={tx - (central ? 1 : 0.5)}
              y={central ? 22 : 30}
              width={central ? 2 : 1}
              height={central ? 34 : 18}
              fill={central ? 'var(--color-tinta)' : 'var(--color-linha)'}
            />
            {c % 25 === 0 && !central && (
              <text
                x={tx}
                y={70}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-tinta-suave)"
              >
                {c > 0 ? `+${c}` : c}
              </text>
            )}
          </g>
        )
      })}
      {/* O ponteiro. A transição curta tira o degrau entre análises sem
          dar a sensação de a agulha estar atrasada. */}
      <g style={{ transition: 'transform 60ms linear' }} transform={`translate(${x - meio} 0)`}>
        <polygon points={`${meio - 7},8 ${meio + 7},8 ${meio},20`} fill={cor} />
        <rect x={meio - 1.5} y={18} width={3} height={40} rx={1.5} fill={cor} />
      </g>
    </svg>
  )
}

function Mostrador({ saida, a4, acidente }: { saida: SaidaAfinador; a4: number; acidente: Acidente }) {
  if (saida.tipo !== 'nota') {
    const texto =
      saida.tipo === 'sinal-fraco'
        ? 'Som demasiado baixo. Aproxima o instrumento do microfone.'
        : saida.tipo === 'incerto'
          ? 'Não consigo identificar uma nota fiável. Toca uma nota de cada vez e deixa-a soar.'
          : 'Toca uma nota e deixa-a soar.'
    return (
      <div
        className="afinador-mostrador afinador-mostrador-vazio flex min-h-[196px] flex-col items-center justify-center gap-[8px] rounded-[18px] border-[1.5px] px-[18px] text-center"
        style={{ borderColor: 'var(--color-linha)', backgroundColor: 'var(--color-papel-2)' }}
      >
        <p className="text-[17px] font-semibold" style={{ color: 'var(--color-tinta)' }}>
          {saida.tipo === 'a-ouvir' ? 'A ouvir…' : 'Sem nota'}
        </p>
        <p className="text-[13px] leading-[1.4]" style={{ color: 'var(--color-tinta-suave)' }}>
          {texto}
        </p>
      </div>
    )
  }

  // Contra a nota que o estabilizador segurou, e não contra a mais
  // próxima da frequência — ver afinacaoRelativa.
  const nota = afinacaoRelativa(saida.midi, saida.frequencia, { a4, acidente })
  if (!nota) return null

  const direcao = direcaoDaAfinacao(nota.cents)
  const afinado = direcao === 'afinado'
  const cents = Math.round(nota.cents)

  return (
    <div
      className="afinador-mostrador rounded-[18px] border-[1.5px] px-[18px] py-[16px]"
      style={{
        borderColor: afinado ? 'var(--color-positive)' : 'var(--color-linha)',
        backgroundColor: 'var(--color-papel-2)',
      }}
    >
      <div className="flex items-end justify-center gap-[6px]">
        <span
          className="text-[58px] font-semibold leading-none"
          style={{ color: 'var(--color-tinta)' }}
        >
          {nota.nome}
        </span>
        <span
          className="pb-[6px] text-[22px] font-semibold leading-none"
          style={{ color: 'var(--color-tinta-suave)' }}
        >
          {nota.oitava}
        </span>
      </div>
      <p className="mt-[2px] text-center text-[12px]" style={{ color: 'var(--color-tinta-suave)' }}>
        {nota.letra}
        {nota.oitava}
      </p>

      <div className="mt-[10px]">
        <Agulha cents={nota.cents} afinado={afinado} />
      </div>

      {/* O texto é o indicador principal, não a cor. Quem não distingue
          verde de cinzento lê aqui a mesma informação. */}
      <p
        aria-live="polite"
        className="text-center text-[15px] font-semibold"
        style={{ color: afinado ? 'var(--color-positive)' : 'var(--color-tinta)' }}
      >
        {afinado ? '✓ ' : ''}
        {textoDaDirecao(direcao)}
        {!afinado && ` · ${cents > 0 ? '+' : ''}${cents} cents`}
      </p>

      <dl
        className="mt-[12px] grid grid-cols-3 gap-[8px] text-center text-[11px]"
        style={{ color: 'var(--color-tinta-suave)' }}
      >
        <div>
          <dt>Detetado</dt>
          <dd className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--color-tinta)' }}>
            {nota.frequencia.toFixed(1).replace('.', ',')} Hz
          </dd>
        </div>
        <div>
          <dt>Alvo</dt>
          <dd className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--color-tinta)' }}>
            {nota.alvo.toFixed(1).replace('.', ',')} Hz
          </dd>
        </div>
        <div>
          <dt>Desvio</dt>
          <dd className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--color-tinta)' }}>
            {cents > 0 ? '+' : ''}
            {cents}
          </dd>
        </div>
      </dl>

      {saida.segurada && (
        <p className="mt-[8px] text-center text-[11px]" style={{ color: 'var(--color-tinta-suave)' }}>
          Última leitura — o som parou.
        </p>
      )}
    </div>
  )
}

export function Afinador() {
  const [a4, setA4] = useState(A4_PADRAO)
  const [acidente, setAcidente] = useState<Acidente>('sustenidos')
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const { fase, iniciar, parar, aOuvir } = useAfinador({ a4 })

  return (
    <div className="afinador-claro max-w-[520px] space-y-[18px]">
      {/* O aviso de privacidade aparece ANTES de o microfone ser pedido,
          e não escondido numas definições: é neste momento que a pessoa
          decide, por isso é aqui que a informação tem de estar. */}
      {!aOuvir && (
        <p
          className="afinador-privacidade rounded-[13px] border-[1.5px] px-[12px] py-[10px] text-[12px] leading-[1.45]"
          style={{ borderColor: 'var(--color-linha)', color: 'var(--color-tinta-suave)' }}
        >
          {TEXTOS_LEGAIS.microfoneAfinador}
        </p>
      )}

      {fase.fase === 'ativo' && (
        <>
          {/* Enquanto ouve, diz-se que ouve. O indicador do browser não
              chega: no telemóvel fica fora do ecrã da app. */}
          <p
            className="afinador-microfone flex items-center justify-center gap-[6px] text-[12px] font-semibold"
            style={{ color: 'var(--color-positive)' }}
          >
            <Mic size={14} aria-hidden="true" />
            Microfone ligado
          </p>
          <Mostrador saida={fase.saida} a4={a4} acidente={acidente} />
        </>
      )}

      {fase.fase === 'a-pedir' && (
        <div
          className="afinador-mostrador flex min-h-[196px] flex-col items-center justify-center gap-[8px] rounded-[18px] border-[1.5px] px-[18px] text-center"
          style={{ borderColor: 'var(--color-linha)', backgroundColor: 'var(--color-papel-2)' }}
        >
          <p className="text-[15px] font-semibold">A pedir acesso ao microfone…</p>
          <p className="text-[12px]" style={{ color: 'var(--color-tinta-suave)' }}>
            Escolhe “Permitir” na pergunta do browser.
          </p>
        </div>
      )}

      {fase.fase === 'erro' && (
        <div
          role="alert"
          className="rounded-[13px] border-[1.5px] px-[14px] py-[12px] text-[13px] leading-[1.45]"
          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
        >
          <span className="flex items-center gap-[6px] font-semibold">
            <MicOff size={15} aria-hidden="true" />
            Sem microfone
          </span>
          <p className="mt-[4px]">{EXPLICACAO[fase.motivo]}</p>
        </div>
      )}

      {fase.fase === 'parado' && fase.motivoDaParagem && (
        <p
          role="status"
          className="rounded-[13px] border-[1.5px] px-[14px] py-[10px] text-[12px] leading-[1.45]"
          style={{ borderColor: 'var(--color-linha)', color: 'var(--color-tinta-suave)' }}
        >
          {fase.motivoDaParagem === 'segundo-plano'
            ? 'O afinador parou quando saíste do ecrã, e o microfone foi libertado. Carrega em Iniciar para voltar.'
            : 'O áudio foi interrompido pelo sistema e o microfone foi libertado. Carrega em Iniciar para voltar.'}
        </p>
      )}

      <div className="afinador-acao">
        <BotaoPrimario onClick={aOuvir ? parar : iniciar}>
          {aOuvir ? 'Parar afinador' : 'Iniciar afinador'}
        </BotaoPrimario>
      </div>

      <div className="afinador-definicoes">
      <div className="afinador-referencia space-y-[6px]">
        <div className="flex items-baseline justify-between gap-[10px]">
          <label
            htmlFor="afinador-a4"
            className="block text-[12.5px] font-medium"
            style={{ color: 'var(--color-tinta-suave)' }}
          >
            Referência do Lá4
          </label>
          <span
            className="text-[12px] font-semibold tabular-nums"
            style={{ color: 'var(--color-tinta-suave)' }}
          >
            {a4} Hz
          </span>
        </div>
        <input
          id="afinador-a4"
          type="range"
          min={A4_MIN}
          max={A4_MAX}
          step={1}
          value={a4}
          onChange={(e) => setA4(Number(e.target.value))}
          className="h-[24px] w-full cursor-pointer"
          style={{ accentColor: 'var(--color-azul-fundo)' }}
        />
        {a4 !== A4_PADRAO && (
          <button
            type="button"
            onClick={() => setA4(A4_PADRAO)}
            className="text-[11px] underline"
            style={{ color: 'var(--color-azul-texto)' }}
          >
            Voltar a 440 Hz
          </button>
        )}
      </div>

      <div className="afinador-notacao space-y-[6px]">
        <p className="text-[12.5px] font-medium" style={{ color: 'var(--color-tinta-suave)' }}>
          Escrita das notas alteradas
        </p>
        <div role="radiogroup" aria-label="Escrita das notas alteradas" className="flex gap-[6px]">
          {ACIDENTES.map((a) => {
            const ativo = acidente === a.id
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => setAcidente(a.id)}
                className="flex h-[44px] flex-1 items-center justify-center gap-[6px] rounded-[13px] border-[1.5px] text-[13px] font-semibold transition-colors"
                style={
                  ativo
                    ? {
                        borderColor: 'var(--color-azul-fundo)',
                        color: 'var(--color-azul-fundo)',
                        backgroundColor: 'var(--color-papel-2)',
                      }
                    : { borderColor: 'var(--color-linha)', color: 'var(--color-tinta-suave)' }
                }
              >
                {a.nome}
                <span style={{ opacity: 0.7 }}>{a.exemplo}</span>
              </button>
            )
          })}
        </div>
      </div>

      </div>

      <div className="afinador-ajuda">
        <button
          type="button"
          onClick={() => setAjudaAberta((v) => !v)}
          aria-expanded={ajudaAberta}
          className="text-[12px] underline"
          style={{ color: 'var(--color-azul-texto)' }}
        >
          Como afinar e o que acontece ao som
        </button>
        {ajudaAberta && (
          <div
            className="mt-[8px] space-y-[8px] rounded-[13px] border-[1.5px] px-[14px] py-[12px] text-[12px] leading-[1.5]"
            style={{ borderColor: 'var(--color-linha)', color: 'var(--color-tinta-suave)' }}
          >
            <p>
              Toca <strong>uma nota de cada vez</strong> e deixa-a soar. O afinador é monofónico:
              com um acorde inteiro não consegue decidir que nota mostrar, e diz que não percebe em
              vez de inventar.
            </p>
            <p>
              Considera-se afinado dentro de {CENTS_AFINADO} cents — um centésimo de meio-tom.
              Numa sala com ruído, aproxima o instrumento do microfone.
            </p>
            <p>{TEXTOS_LEGAIS.microfoneAfinador}</p>
          </div>
        )}
      </div>
    </div>
  )
}
