'use client'

import { useEffect, useRef, useState } from 'react'

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
    <div className="space-y-6 max-w-xs">
      <div className="space-y-1">
        <label htmlFor="metronomo-bpm" className="block text-sm font-medium">
          BPM ({BPM_MIN}–{BPM_MAX})
        </label>
        <input
          id="metronomo-bpm"
          type="number"
          inputMode="numeric"
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpmTexto}
          onChange={(e) => aplicarBpm(e.target.value)}
          onBlur={normalizarBpm}
          className="w-full rounded border border-foreground/20 bg-background px-3 py-2 text-lg"
        />
      </div>

      <div className="space-y-1">
        <span className="block text-sm font-medium">Compasso</span>
        <div className="flex items-center gap-2">
          <input
            aria-label="Número de batidas por compasso"
            type="number"
            inputMode="numeric"
            min={NUMERADOR_MIN}
            max={NUMERADOR_MAX}
            value={numeradorTexto}
            onChange={(e) => aplicarNumerador(e.target.value)}
            onBlur={normalizarNumerador}
            className="w-16 rounded border border-foreground/20 bg-background px-2 py-2 text-center text-lg"
          />
          <span className="text-lg text-foreground/60">/</span>
          <div className="flex gap-1">
            {DENOMINADORES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDenominador(d)}
                className={
                  denominador === d
                    ? 'rounded bg-brand px-3 py-2 text-white'
                    : 'rounded border border-foreground/20 px-3 py-2 text-foreground/70'
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
        className={
          acentuar
            ? 'w-full rounded border border-brand bg-brand/10 px-4 py-2 text-sm text-brand'
            : 'w-full rounded border border-foreground/20 px-4 py-2 text-sm text-foreground/60'
        }
      >
        Acentuar 1º tempo: {acentuar ? 'ligado' : 'desligado'}
      </button>

      <div className="flex justify-center gap-1">
        {Array.from({ length: numerador }, (_, i) => (
          <span
            key={i}
            className={
              'h-3 w-3 rounded-full ' +
              (aTocar && batidaAtual === i
                ? i === 0 && acentuar
                  ? 'bg-brand'
                  : 'bg-brand-light'
                : 'bg-foreground/15')
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={aTocar ? parar : iniciar}
        className="w-full rounded bg-brand text-white hover:bg-brand-hover py-3 text-lg font-semibold"
      >
        {aTocar ? 'Parar' : 'Iniciar'}
      </button>
    </div>
  )
}
