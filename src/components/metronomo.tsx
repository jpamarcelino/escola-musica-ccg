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

export function Metronomo() {
  const [bpm, setBpm] = useState(100)
  const [bpmTexto, setBpmTexto] = useState('100')
  const [numerador, setNumerador] = useState(4)
  const [numeradorTexto, setNumeradorTexto] = useState('4')
  const [denominador, setDenominador] = useState<(typeof DENOMINADORES)[number]>(4)
  const [acentuar, setAcentuar] = useState(true)
  const [aTocar, setATocar] = useState(false)
  const [batidaAtual, setBatidaAtual] = useState<number | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerIdRef = useRef<number | null>(null)
  const proximaBatidaTempoRef = useRef(0)
  const proximaBatidaNumeroRef = useRef(0)
  const bpmRef = useRef(bpm)
  const numeradorRef = useRef(numerador)
  const acentuarRef = useRef(acentuar)

  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])
  useEffect(() => {
    numeradorRef.current = numerador
  }, [numerador])
  useEffect(() => {
    acentuarRef.current = acentuar
  }, [acentuar])

  useEffect(() => {
    return () => {
      if (timerIdRef.current) window.clearTimeout(timerIdRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  function tocarSom(numeroBatida: number, tempo: number) {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const acento = acentuarRef.current && numeroBatida === 0

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.frequency.value = acento ? 1600 : 950
    gain.gain.setValueAtTime(acento ? 0.9 : 0.55, tempo)
    gain.gain.exponentialRampToValueAtTime(0.001, tempo + 0.06)

    osc.start(tempo)
    osc.stop(tempo + 0.07)

    const atrasoMs = Math.max(0, (tempo - ctx.currentTime) * 1000)
    window.setTimeout(() => setBatidaAtual(numeroBatida), atrasoMs)
  }

  function agendarProxima() {
    const ctx = audioCtxRef.current
    if (!ctx) return
    while (proximaBatidaTempoRef.current < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      tocarSom(proximaBatidaNumeroRef.current, proximaBatidaTempoRef.current)
      proximaBatidaTempoRef.current += 60 / bpmRef.current
      proximaBatidaNumeroRef.current = (proximaBatidaNumeroRef.current + 1) % numeradorRef.current
    }
    timerIdRef.current = window.setTimeout(agendarProxima, LOOKAHEAD_MS)
  }

  function iniciar() {
    const AudioContextClasse =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContextClasse()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()

    proximaBatidaNumeroRef.current = 0
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

      <button
        type="button"
        onClick={() => setAcentuar((v) => !v)}
        className="flex h-[44px] w-full items-center justify-center rounded-[13px] border-[1.5px] text-[14px] font-semibold transition-colors"
        style={
          acentuar
            ? { borderColor: 'var(--color-azul-fundo)', color: 'var(--color-azul-fundo)', backgroundColor: 'var(--color-papel-2)' }
            : { borderColor: 'var(--color-linha)', color: 'var(--color-tinta-suave)' }
        }
      >
        Acentuar 1º tempo: {acentuar ? 'ligado' : 'desligado'}
      </button>

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
