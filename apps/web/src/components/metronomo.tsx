'use client'

import { useEffect, useRef, useState } from 'react'
import { Rotulo, classesCampo } from '@/components/campo-formulario'
import { BotaoPrimario } from '@/components/botao-primario'

const BPM_MIN = 5
const BPM_MAX = 900
const NUMERADOR_MIN = 2
const NUMERADOR_MAX = 15
const DENOMINADORES = [2, 4, 8] as const

// Agendamento com "lookahead" (técnica standard para metrónomos em Web
// Audio — ver "A Tale of Two Clocks" da Web Audio API): em vez de tocar o
// som diretamente num setInterval (que sofre do jitter do event loop do
// JS), o setInterval só verifica a cada 25ms se há batidas a agendar nos
// próximos 100ms, e agenda-as com o tempo exato do AudioContext — o
// timing do som em si nunca depende do JS.
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SEC = 0.1

// Os faders andam de 0 a 100 e o valor é a amplitude em percentagem —
// 55 é 0.55 de ganho. Estes três números eram os que estavam escritos à
// mão dentro do tocarSom, agora são só o ponto de partida.
const VOL_ACENTO_INICIAL = 90
const VOL_TEMPO_INICIAL = 55
const VOL_SUB_INICIAL = 18

// Abaixo disto o som é inaudível e a rampa de fim deixa de fazer
// sentido: ela desce até 0.001, e uma descida exponencial que comece
// por baixo do próprio destino sobe em vez de descer. Nesse caso não se
// chega a criar o oscilador.
const VOL_MINIMO = 0.003

// Subdivisões: quantos toques cabem dentro de cada tempo.
//
// "Off" é 1 — o tempo por dividir. Guardar o desligado como mais um
// valor da mesma lista, em vez de um booleano à parte, faz com que o
// agendador não tenha de saber que a subdivisão existe: divide sempre
// o tempo em N, e quando N é 1 o resultado é o metrónomo de antes.
//
// "Quintina" e "sextina" são os nomes portugueses destes grupos. Uma
// "quinta" é um intervalo, e num ecrã de música dizer "quintas" mandava
// o aluno pensar noutra coisa.
//
// Cada subdivisão tem duas coisas separadas: em quantas partes se divide
// o tempo (`divisao`) e quais dessas partes soam (`toques`). Enquanto
// todas soavam, um número chegava; o swing obriga a separá-las, porque
// divide o tempo em três mas só toca a 1.ª e a 3.ª.
type Subdivisao = {
  id: string
  divisao: number
  toques: number[]
  nome: string
  descricao: string
}

const todos = (n: number) => Array.from({ length: n }, (_, i) => i)

const SUBDIVISOES: Subdivisao[] = [
  { id: 'off', divisao: 1, toques: [0], nome: 'Off', descricao: 'Sem subdivisão' },
  { id: '2', divisao: 2, toques: todos(2), nome: 'Colcheias', descricao: 'Duas por tempo' },
  { id: '3', divisao: 3, toques: todos(3), nome: 'Tercinas', descricao: 'Três por tempo' },
  { id: '4', divisao: 4, toques: todos(4), nome: 'Semicolcheias', descricao: 'Quatro por tempo' },
  { id: '5', divisao: 5, toques: todos(5), nome: 'Quintinas', descricao: 'Cinco por tempo' },
  { id: '6', divisao: 6, toques: todos(6), nome: 'Sextinas', descricao: 'Seis por tempo' },
  { id: '7', divisao: 7, toques: todos(7), nome: 'Septinas', descricao: 'Sete por tempo' },
  { id: '8', divisao: 8, toques: todos(8), nome: 'Fusas', descricao: 'Oito por tempo' },
  {
    id: 'swing',
    divisao: 3,
    toques: [0, 2],
    nome: 'Swing',
    descricao: 'Colcheia swingada — 1.ª e 3.ª da tercina',
  },
]

// O desenho de cada subdivisão: as cabeças de nota que soam, unidas por
// uma barra, com o algarismo por cima quando o grupo é irregular.
//
// Desenhado à mão e não em texto porque o Unicode só tem ♪ ♫ ♬ — não há
// glifo para tercina nem para sextina, e misturar glifos com números
// sobrescritos dava nove símbolos com nove aspetos diferentes.
//
// As cabeças ficam na posição da grelha a que pertencem, não espalhadas
// por igual: no swing isso deixa o buraco visível a meio, que é o que
// distingue o símbolo do da colcheia normal.
function SimboloSubdivisao({ sub }: { sub: Subdivisao }) {
  const n = sub.divisao
  const inicio = 5
  const fim = 33
  const largura = n > 1 ? (fim - inicio) / (n - 1) : 0
  const xs = sub.toques.map((t) => (n === 1 ? 19 : inicio + t * largura))
  const topoHaste = 7
  const baseNota = 17
  // As cabeças encolhem à medida que são mais: com oito do mesmo tamanho
  // das duas da colcheia, sobrepunham-se num borrão preto e o símbolo
  // deixava de se distinguir do da quintina.
  const raio = n <= 3 ? 2.5 : n === 4 ? 2.1 : n <= 6 ? 1.75 : 1.4
  // Barras como na pauta: uma na colcheia, duas da semicolcheia à
  // septina, três na fusa.
  const barras = n === 1 ? 0 : n <= 3 ? 1 : n <= 7 ? 2 : 3
  // O algarismo marca os grupos irregulares. No swing é 3 e não 2, porque
  // o que está escrito continua a ser uma tercina — só com a nota do meio
  // por tocar.
  const numero = [3, 5, 6, 7].includes(n) ? n : null

  return (
    <svg viewBox="0 0 38 22" className="h-[22px] w-[38px]" aria-hidden="true" fill="currentColor">
      {numero !== null && (
        <text x="19" y="4.5" textAnchor="middle" fontSize="6.5" fontWeight="700">
          {numero}
        </text>
      )}
      {xs.map((x, i) => (
        <g key={i}>
          <ellipse
            cx={x}
            cy={baseNota}
            rx={raio}
            ry={raio * 0.76}
            transform={`rotate(-18 ${x} ${baseNota})`}
          />
          <rect x={x + raio - 0.6} y={topoHaste} width="0.8" height={baseNota - topoHaste} />
        </g>
      ))}
      {xs.length > 1 &&
        Array.from({ length: barras }, (_, b) => (
          <rect
            key={b}
            x={xs[0] + raio - 0.6}
            y={topoHaste + b * 2.9}
            width={xs[xs.length - 1] - xs[0] + 0.8}
            height="1.6"
          />
        ))}
    </svg>
  )
}

// Um fader. <input type="range"> nativo e não uma barra desenhada à mão:
// no telemóvel o arrasto, o toque a meio da barra e o VoiceOver já vêm
// resolvidos, e nada disso se reescreve bem.
//
// "inativo" não desliga o fader, só o esbate: quem baixa o volume da
// subdivisão com a subdivisão em Off tem de perceber que o que fez não
// se ouve por causa disso, e um controlo bloqueado não explica porquê.
function Fader({
  id,
  rotulo,
  valor,
  aoMudar,
  inativo,
  nota,
}: {
  id: string
  rotulo: string
  valor: number
  aoMudar: (v: number) => void
  inativo?: boolean
  nota?: string
}) {
  return (
    <div className="space-y-[4px]" style={{ opacity: inativo ? 0.5 : 1 }}>
      <div className="flex items-baseline justify-between gap-[10px]">
        <Rotulo htmlFor={id}>{rotulo}</Rotulo>
        <span
          className="text-[12px] font-semibold tabular-nums"
          style={{ color: 'var(--color-tinta-suave)' }}
        >
          {valor}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="h-[24px] w-full cursor-pointer"
        style={{ accentColor: 'var(--color-azul-fundo)' }}
      />
      {nota && (
        <p className="text-[11px] leading-[1.35]" style={{ color: 'var(--color-tinta-suave)' }}>
          {nota}
        </p>
      )}
    </div>
  )
}

export function Metronomo() {
  const [bpm, setBpm] = useState(100)
  const [bpmTexto, setBpmTexto] = useState('100')
  const [numerador, setNumerador] = useState(4)
  const [numeradorTexto, setNumeradorTexto] = useState('4')
  const [denominador, setDenominador] = useState<(typeof DENOMINADORES)[number]>(4)
  const [acentuar, setAcentuar] = useState(true)
  const [volAcento, setVolAcento] = useState(VOL_ACENTO_INICIAL)
  const [volTempo, setVolTempo] = useState(VOL_TEMPO_INICIAL)
  const [volSub, setVolSub] = useState(VOL_SUB_INICIAL)
  const [subdivisao, setSubdivisao] = useState<Subdivisao>(SUBDIVISOES[0])
  const [aTocar, setATocar] = useState(false)
  const [batidaAtual, setBatidaAtual] = useState<number | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerIdRef = useRef<number | null>(null)
  const proximaBatidaTempoRef = useRef(0)
  const proximaBatidaNumeroRef = useRef(0)
  const bpmRef = useRef(bpm)
  const numeradorRef = useRef(numerador)
  const acentuarRef = useRef(acentuar)
  const volAcentoRef = useRef(volAcento)
  const volTempoRef = useRef(volTempo)
  const volSubRef = useRef(volSub)
  const subdivisaoRef = useRef<Subdivisao>(subdivisao)
  // Dois contadores em vez de um só: qual o tempo do compasso, e em que
  // ponto do tempo vamos. Um contador único (0..numerador*subdivisão)
  // ficava fora de alcance assim que se mudasse a subdivisão a tocar.
  const passoDentroDaBatidaRef = useRef(0)

  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])
  useEffect(() => {
    numeradorRef.current = numerador
  }, [numerador])
  useEffect(() => {
    acentuarRef.current = acentuar
  }, [acentuar])
  // Pelos refs e não pelas variáveis do render: o agendador corre dentro
  // de um setTimeout que ficou preso ao render em que arrancou, por isso
  // mexer num fader a tocar não chegava lá.
  useEffect(() => {
    volAcentoRef.current = volAcento
  }, [volAcento])
  useEffect(() => {
    volTempoRef.current = volTempo
  }, [volTempo])
  useEffect(() => {
    volSubRef.current = volSub
  }, [volSub])
  useEffect(() => {
    subdivisaoRef.current = subdivisao
  }, [subdivisao])

  useEffect(() => {
    return () => {
      if (timerIdRef.current) window.clearTimeout(timerIdRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  function tocarSom(numeroBatida: number, passoNaBatida: number, intervalo: number, tempo: number) {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const naBatida = passoNaBatida === 0
    const acento = acentuarRef.current && naBatida && numeroBatida === 0

    const volume =
      (acento ? volAcentoRef.current : naBatida ? volTempoRef.current : volSubRef.current) / 100
    // Um fader no fundo cala mesmo aquele som, em vez de o deixar a
    // roçar: sem isto, o oscilador continuava a ser criado e agendado
    // para nada.
    if (volume < VOL_MINIMO) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    // A subdivisão tem de se ouvir por baixo do tempo, e não ao lado
    // dele: outra forma de onda (triangular, mais abafada) e mais aguda
    // para não se confundir com a batida. Todas as subdivisões dentro do
    // tempo soam igual — o que marca o tempo é a batida, e acentuar uma
    // subdivisão a meio dava um segundo pulso a competir com ela.
    osc.type = naBatida ? 'sine' : 'triangle'
    osc.frequency.value = acento ? 1600 : naBatida ? 950 : 1350
    gain.gain.setValueAtTime(volume, tempo)

    // O clique nunca pode ser mais comprido do que o espaço que tem. A
    // 900 bpm com fusas há um toque a cada 8ms, e sem isto cada som
    // pisava os seguintes até virar um zumbido contínuo.
    const duracao = Math.min(naBatida ? 0.06 : 0.035, intervalo * 0.6)
    gain.gain.exponentialRampToValueAtTime(0.001, tempo + duracao)

    osc.start(tempo)
    osc.stop(tempo + duracao + 0.01)

    // O ponto no ecrã segue o tempo, não a subdivisão: a piscar 90 vezes
    // por segundo não se lia nada.
    if (naBatida) {
      const atrasoMs = Math.max(0, (tempo - ctx.currentTime) * 1000)
      window.setTimeout(() => setBatidaAtual(numeroBatida), atrasoMs)
    }
  }

  function agendarProxima() {
    const ctx = audioCtxRef.current
    if (!ctx) return
    while (proximaBatidaTempoRef.current < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      const sub = subdivisaoRef.current
      // Se a subdivisão encolheu enquanto tocava, o passo onde íamos pode
      // já não existir. Nesse caso passa-se ao tempo seguinte em vez de
      // tocar um toque fantasma fora da grelha.
      const passo = passoDentroDaBatidaRef.current < sub.divisao ? passoDentroDaBatidaRef.current : 0
      const intervalo = 60 / bpmRef.current / sub.divisao

      // Os passos calados do swing contam na mesma para o relógio: é o
      // silêncio no meio da tercina que atrasa a segunda colcheia. Só o
      // som é que se salta, nunca o avanço do tempo.
      if (sub.toques.includes(passo)) {
        tocarSom(proximaBatidaNumeroRef.current, passo, intervalo, proximaBatidaTempoRef.current)
      }

      proximaBatidaTempoRef.current += intervalo
      const seguinte = passo + 1
      if (seguinte >= sub.divisao) {
        passoDentroDaBatidaRef.current = 0
        proximaBatidaNumeroRef.current = (proximaBatidaNumeroRef.current + 1) % numeradorRef.current
      } else {
        passoDentroDaBatidaRef.current = seguinte
      }
    }
    timerIdRef.current = window.setTimeout(agendarProxima, LOOKAHEAD_MS)
  }

  function iniciar() {
    const AudioContextClasse =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContextClasse()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()

    proximaBatidaNumeroRef.current = 0
    passoDentroDaBatidaRef.current = 0
    proximaBatidaTempoRef.current = audioCtxRef.current.currentTime + 0.05
    setATocar(true)
    agendarProxima()
  }

  function parar() {
    setATocar(false)
    setBatidaAtual(null)
    if (timerIdRef.current) {
      window.clearTimeout(timerIdRef.current)
      timerIdRef.current = null
    }
  }

  function aplicarBpm(texto: string) {
    setBpmTexto(texto)
    const n = Number(texto)
    if (texto !== '' && Number.isFinite(n)) {
      setBpm(Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(n))))
    }
  }

  function normalizarBpm() {
    const n = Number(bpmTexto)
    const valido = textoValido(bpmTexto) ? Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(n))) : bpm
    setBpm(valido)
    setBpmTexto(String(valido))
  }

  function aplicarNumerador(texto: string) {
    setNumeradorTexto(texto)
    const n = Number(texto)
    if (texto !== '' && Number.isFinite(n)) {
      setNumerador(Math.min(NUMERADOR_MAX, Math.max(NUMERADOR_MIN, Math.round(n))))
    }
  }

  function normalizarNumerador() {
    const n = Number(numeradorTexto)
    const valido = textoValido(numeradorTexto) ? Math.min(NUMERADOR_MAX, Math.max(NUMERADOR_MIN, Math.round(n))) : numerador
    setNumerador(valido)
    setNumeradorTexto(String(valido))
  }

  function textoValido(t: string) {
    const n = Number(t)
    return t !== '' && Number.isFinite(n)
  }

  return (
    <div className="max-w-[380px] space-y-[22px]">
      <div className="space-y-[6px]">
        <Rotulo htmlFor="metronomo-bpm">BPM ({BPM_MIN}–{BPM_MAX})</Rotulo>
        <input
          id="metronomo-bpm"
          type="number"
          inputMode="numeric"
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpmTexto}
          onChange={(e) => aplicarBpm(e.target.value)}
          onBlur={normalizarBpm}
          className={`${classesCampo} text-[17px]`}
        />
      </div>

      <div className="space-y-[6px]">
        <Rotulo htmlFor="metronomo-numerador">Compasso</Rotulo>
        <div className="flex items-center gap-[10px]">
          <input
            id="metronomo-numerador"
            aria-label="Número de batidas por compasso"
            type="number"
            inputMode="numeric"
            min={NUMERADOR_MIN}
            max={NUMERADOR_MAX}
            value={numeradorTexto}
            onChange={(e) => aplicarNumerador(e.target.value)}
            onBlur={normalizarNumerador}
            className={`${classesCampo} w-[64px] text-center text-[17px]`}
          />
          <span className="text-[17px]" style={{ color: 'var(--color-tinta-suave)' }}>
            /
          </span>
          <div className="flex gap-[6px]">
            {DENOMINADORES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDenominador(d)}
                className="flex h-[44px] w-[44px] items-center justify-center rounded-[13px] border-[1.5px] text-[15px] font-semibold transition-colors"
                style={
                  denominador === d
                    ? { borderColor: 'var(--color-azul-fundo)', backgroundColor: 'var(--color-azul-fundo)', color: '#fff' }
                    : { borderColor: 'var(--color-linha)', color: 'var(--color-tinta-suave)' }
                }
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-[6px]">
        <Rotulo htmlFor="metronomo-subdivisao">Subdivisão</Rotulo>
        {/* radiogroup e não nove botões soltos: só uma pode estar ligada,
            e é isso que faz o leitor de ecrã anunciar "1 de 9" e as setas
            do teclado andarem entre elas. */}
        <div
          id="metronomo-subdivisao"
          role="radiogroup"
          aria-label="Subdivisão do tempo"
          className="grid grid-cols-3 gap-[6px]"
        >
          {SUBDIVISOES.map((s) => {
            const ativa = subdivisao.id === s.id
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={ativa}
                onClick={() => setSubdivisao(s)}
                title={s.descricao}
                className="flex min-h-[62px] flex-col items-center justify-center gap-[3px] rounded-[13px] border-[1.5px] px-[4px] transition-colors"
                style={
                  ativa
                    ? {
                        borderColor: 'var(--color-azul-fundo)',
                        color: 'var(--color-azul-fundo)',
                        backgroundColor: 'var(--color-papel-2)',
                      }
                    : { borderColor: 'var(--color-linha)', color: 'var(--color-tinta-suave)' }
                }
              >
                <SimboloSubdivisao sub={s} />
                {/* O nome por baixo do desenho, e não só no title: uma
                    tercina e uma quintina distinguem-se por um algarismo
                    de 6px, e quem está a aprender não deve ter de o
                    decifrar para saber em que carregou. */}
                <span className="text-[10px] font-semibold leading-none">{s.nome}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* aria-pressed em vez de escrever o estado no texto. "Acentuar 1º
          tempo: ligado" era ambíguo — não se percebia se "ligado" era o
          estado atual ou o que ia acontecer ao carregar. Agora o rótulo
          diz sempre a mesma coisa e o estado vive no aria-pressed (que o
          leitor de ecrã anuncia) e na cor. */}
      <button
        type="button"
        onClick={() => setAcentuar((v) => !v)}
        aria-pressed={acentuar}
        className="flex h-[44px] w-full items-center justify-center gap-[10px] rounded-[13px] border-[1.5px] text-[14px] font-semibold transition-colors"
        style={
          acentuar
            ? { borderColor: 'var(--color-azul-fundo)', color: 'var(--color-azul-fundo)', backgroundColor: 'var(--color-papel-2)' }
            : { borderColor: 'var(--color-linha)', color: 'var(--color-tinta-suave)' }
        }
      >
        Acentuar 1º tempo
        <span
          aria-hidden="true"
          className="text-[12px] font-medium"
          style={{ opacity: 0.75 }}
        >
          {acentuar ? '● ligado' : '○ desligado'}
        </span>
      </button>

      {/* Cabeçalho e não <Rotulo>: um rótulo aponta para um controlo, e
          este está por cima de três. Apontado ao primeiro, o leitor de
          ecrã anunciava esse fader como "Volumes 1.º tempo". */}
      <div role="group" aria-labelledby="metronomo-volumes" className="space-y-[14px]">
        <p
          id="metronomo-volumes"
          className="text-[12.5px] font-medium"
          style={{ color: 'var(--color-tinta-suave)' }}
        >
          Volumes
        </p>
        <Fader
          id="metronomo-vol-acento"
          rotulo="1.º tempo"
          valor={volAcento}
          aoMudar={setVolAcento}
          inativo={!acentuar}
          nota={acentuar ? undefined : 'Sem acento, o 1.º tempo soa como os outros.'}
        />
        <Fader
          id="metronomo-vol-tempo"
          rotulo="Tempos"
          valor={volTempo}
          aoMudar={setVolTempo}
        />
        <Fader
          id="metronomo-vol-sub"
          rotulo="Subdivisão"
          valor={volSub}
          aoMudar={setVolSub}
          inativo={subdivisao.id === 'off'}
          nota={subdivisao.id === 'off' ? 'Só se ouve com uma subdivisão escolhida.' : undefined}
        />
      </div>

      <div className="flex justify-center gap-[6px]">
        {Array.from({ length: numerador }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="h-[10px] w-[10px] rounded-full transition-colors"
            style={{
              backgroundColor:
                aTocar && batidaAtual === i
                  ? i === 0 && acentuar
                    ? 'var(--color-azul-fundo)'
                    : 'var(--color-azul-logo)'
                  : 'var(--color-linha)',
            }}
          />
        ))}
      </div>

      <BotaoPrimario onClick={aTocar ? parar : iniciar}>
        {aTocar ? 'Parar' : 'Iniciar'}
      </BotaoPrimario>
    </div>
  )
}
