import { describe, expect, it, vi } from 'vitest'
import {
  abrirMicrofone,
  FalhaDoMicrofone,
  suportado,
  TAMANHO_BLOCO,
  type AmbienteAudio,
} from './microfone'

// Duplos do browser. Contam quantas vezes cada coisa foi libertada, que
// é precisamente o que este ficheiro existe para verificar.
function criarAmbiente(
  ajustes: {
    permissao?: PermissionState | null
    falhaDoGum?: { name: string }
    contextoSeguro?: boolean
  } = {},
) {
  const track = {
    parada: 0,
    ouvintes: new Map<string, (() => void)[]>(),
    stop() {
      this.parada++
    },
    addEventListener(nome: string, f: () => void) {
      this.ouvintes.set(nome, [...(this.ouvintes.get(nome) ?? []), f])
    },
    removeEventListener(nome: string, f: () => void) {
      this.ouvintes.set(nome, (this.ouvintes.get(nome) ?? []).filter((g) => g !== f))
    },
    disparar(nome: string) {
      ;[...(this.ouvintes.get(nome) ?? [])].forEach((f) => f())
    },
  }

  const nos = { ligados: 0, desligados: 0 }
  function criarNo() {
    return {
      connect() {
        nos.ligados++
      },
      disconnect() {
        nos.desligados++
      },
    }
  }

  const ctx = {
    fechado: 0,
    state: 'running' as AudioContextState,
    sampleRate: 48000,
    createMediaStreamSource: () => criarNo(),
    createBiquadFilter: () => ({ ...criarNo(), type: '', frequency: { value: 0 } }),
    createAnalyser: () => ({
      ...criarNo(),
      fftSize: 0,
      getFloatTimeDomainData(destino: Float32Array) {
        destino.fill(0.5)
      },
    }),
    resume: async () => {},
    close() {
      this.fechado++
      return Promise.resolve()
    },
  }

  const stream = { getAudioTracks: () => [track] }

  const ambiente: AmbienteAudio = {
    contextoSeguro: ajustes.contextoSeguro ?? true,
    pedirMicrofone: async () => {
      if (ajustes.falhaDoGum) throw Object.assign(new Error('não'), ajustes.falhaDoGum)
      return stream as unknown as MediaStream
    },
    criarContexto: () => ctx as unknown as AudioContext,
    estadoDaPermissao: async () => ajustes.permissao ?? null,
  }

  return { ambiente, track, ctx, nos }
}

describe('suporte do browser', () => {
  it('sem getUserMedia nem AudioContext, não é suportado', () => {
    expect(suportado({})).toBe(false)
  })
})

describe('erros de permissão e de dispositivo', () => {
  it('fora de um contexto seguro, recusa antes de pedir seja o que for', async () => {
    const { ambiente } = criarAmbiente({ contextoSeguro: false })
    const pedir = vi.spyOn(ambiente, 'pedirMicrofone')
    await expect(abrirMicrofone(ambiente)).rejects.toMatchObject({
      motivo: 'contexto-inseguro',
    })
    // O importante: nem chegou a pedir o microfone.
    expect(pedir).not.toHaveBeenCalled()
  })

  it('com a permissão já negada, diz que está bloqueada e não insiste', async () => {
    const { ambiente } = criarAmbiente({ permissao: 'denied' })
    const pedir = vi.spyOn(ambiente, 'pedirMicrofone')
    await expect(abrirMicrofone(ambiente)).rejects.toMatchObject({ motivo: 'bloqueada' })
    expect(pedir).not.toHaveBeenCalled()
  })

  it('recusa desta vez é diferente de bloqueio permanente', async () => {
    const { ambiente } = criarAmbiente({
      permissao: 'prompt',
      falhaDoGum: { name: 'NotAllowedError' },
    })
    await expect(abrirMicrofone(ambiente)).rejects.toMatchObject({ motivo: 'recusada' })
  })

  it.each([
    ['NotFoundError', 'sem-microfone'],
    ['OverconstrainedError', 'sem-microfone'],
    ['NotReadableError', 'ocupado'],
    ['AbortError', 'ocupado'],
    ['ChatoError', 'desconhecido'],
  ])('%s vira %s', async (nome, motivo) => {
    const { ambiente } = criarAmbiente({ permissao: 'prompt', falhaDoGum: { name: nome } })
    await expect(abrirMicrofone(ambiente)).rejects.toMatchObject({ motivo })
  })

  it('a falha é do tipo próprio, para o ecrã poder distinguir', async () => {
    const { ambiente } = criarAmbiente({ contextoSeguro: false })
    await expect(abrirMicrofone(ambiente)).rejects.toBeInstanceOf(FalhaDoMicrofone)
  })
})

describe('captação', () => {
  it('lê blocos do tamanho pedido sem guardar nada', async () => {
    const { ambiente } = criarAmbiente()
    const c = await abrirMicrofone(ambiente)
    const bloco = new Float32Array(TAMANHO_BLOCO)
    c.ler(bloco)
    expect(bloco[0]).toBe(0.5)
    expect(c.taxaAmostragem).toBe(48000)
    c.parar()
  })

  it('depois de parar, ler não faz nada', async () => {
    const { ambiente } = criarAmbiente()
    const c = await abrirMicrofone(ambiente)
    c.parar()
    const bloco = new Float32Array(TAMANHO_BLOCO)
    c.ler(bloco)
    expect(bloco.every((v) => v === 0)).toBe(true)
  })
})

describe('libertação de recursos', () => {
  it('parar solta a track, desliga os nós e fecha o contexto', async () => {
    const { ambiente, track, ctx, nos } = criarAmbiente()
    const c = await abrirMicrofone(ambiente)
    expect(track.parada).toBe(0)

    c.parar()

    // A track parada é o que apaga a luz do microfone. Sem isto, fechar
    // o contexto não bastava e o indicador ficava aceso.
    expect(track.parada).toBe(1)
    expect(ctx.fechado).toBe(1)
    expect(nos.desligados).toBe(3)
    expect(track.ouvintes.get('ended')?.length ?? 0).toBe(0)
  })

  it('parar duas vezes não liberta duas vezes', async () => {
    const { ambiente, track, ctx } = criarAmbiente()
    const c = await abrirMicrofone(ambiente)
    c.parar()
    c.parar()
    c.parar()
    expect(track.parada).toBe(1)
    expect(ctx.fechado).toBe(1)
  })

  it('avisa quando o sistema corta o áudio por baixo dos pés', async () => {
    const { ambiente, track } = criarAmbiente()
    const c = await abrirMicrofone(ambiente)
    const avisado = vi.fn()
    c.aoInterromper(avisado)

    track.disparar('ended')

    expect(avisado).toHaveBeenCalledTimes(1)
    c.parar()
  })

  it('depois de parar, uma interrupção tardia já não chama ninguém', async () => {
    const { ambiente, track } = criarAmbiente()
    const c = await abrirMicrofone(ambiente)
    const avisado = vi.fn()
    c.aoInterromper(avisado)
    c.parar()

    track.disparar('ended')

    expect(avisado).not.toHaveBeenCalled()
  })
})
