// Captação do microfone para o afinador, na web.
//
// Uma regra atravessa este ficheiro: o áudio nunca sai daqui. O que sobe
// para cima é um Float32Array reutilizado, lido do AnalyserNode e
// analisado no mesmo instante. Nada é gravado, acumulado, guardado em
// disco ou enviado seja para onde for.
//
// As dependências do browser entram por parâmetro em vez de serem lidas
// diretamente dos globais. Não é cerimónia: é o que permite testar em
// Node que parar o afinador liberta mesmo as tracks e fecha o contexto —
// e essa é a parte que, se falhar, deixa o microfone do utilizador ligado
// sem ele saber.

// 4096 amostras são 85 ms a 48 kHz. Precisa de ser pelo menos dois
// períodos completos da nota mais grave: o Si0 de um baixo de cinco
// cordas anda nos 31 Hz, ou seja 1550 amostras por período. Abaixo disto
// a autocorrelação não tem repetição que chegue para medir.
export const TAMANHO_BLOCO = 4096

// Corta o que está abaixo e acima da gama de trabalho. O corte grave
// tira o ronco de ar condicionado e a componente contínua de muitos
// microfones de telemóvel; o agudo tira o chiado, que é a principal
// fonte de leituras erráticas em salas silenciosas.
const CORTE_GRAVE_HZ = 25
const CORTE_AGUDO_HZ = 5000

export type ErroMicrofone =
  | 'sem-suporte'
  | 'contexto-inseguro'
  | 'recusada'
  | 'bloqueada'
  | 'sem-microfone'
  | 'ocupado'
  | 'desconhecido'

export class FalhaDoMicrofone extends Error {
  constructor(readonly motivo: ErroMicrofone, causa?: unknown) {
    super(`Microfone indisponível: ${motivo}`)
    this.name = 'FalhaDoMicrofone'
    if (causa instanceof Error) this.cause = causa
  }
}

export type Captura = {
  taxaAmostragem: number
  /**
   * Preenche o destino com o bloco mais recente. Não copia nem guarda.
   *
   * O <ArrayBuffer> explícito não é adorno: desde o TypeScript 5.7 os
   * arrays tipados são genéricos no buffer, e o getFloatTimeDomainData
   * recusa um SharedArrayBuffer — que não pode mesmo ser usado aqui.
   */
  ler(destino: Float32Array<ArrayBuffer>): void
  /** Idempotente: chamar duas vezes não estoira nem liberta duas vezes. */
  parar(): void
  /** Avisa quando o próprio sistema corta o áudio (chamada, desligar o dispositivo). */
  aoInterromper(callback: () => void): void
}

// O mínimo do browser de que isto precisa, escrito à mão para o teste
// poder fornecer um duplo sem arrastar o DOM inteiro.
export type AmbienteAudio = {
  contextoSeguro: boolean
  pedirMicrofone: () => Promise<MediaStream>
  criarContexto: () => AudioContext
  estadoDaPermissao: () => Promise<PermissionState | null>
}

export function ambienteDoBrowser(): AmbienteAudio {
  return {
    contextoSeguro: typeof window !== 'undefined' && window.isSecureContext,
    pedirMicrofone: () =>
      navigator.mediaDevices.getUserMedia({
        // Os três desligados de propósito. O cancelamento de eco, a
        // supressão de ruído e sobretudo o ganho automático são feitos
        // para voz: comprimem, cortam sustentados e alteram o sinal ao
        // ponto de um afinador deixar de ser fiável.
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      }),
    criarContexto: () => {
      const Classe =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      return new Classe()
    },
    estadoDaPermissao: async () => {
      // O Safari não conhece o nome "microphone" nesta API e atira. Não
      // saber o estado não é um erro — só quer dizer que não dá para
      // distinguir "recusou agora" de "está bloqueado nas definições".
      try {
        const p = navigator.permissions
        if (!p?.query) return null
        const r = await p.query({ name: 'microphone' as PermissionName })
        return r.state
      } catch {
        return null
      }
    },
  }
}

export function suportado(ambiente: Partial<AmbienteAudio> = {}): boolean {
  if (ambiente.pedirMicrofone) return true
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const temGum = Boolean(navigator.mediaDevices?.getUserMedia)
  const temContexto = Boolean(
    window.AudioContext ||
      (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext,
  )
  return temGum && temContexto
}

function traduzirFalha(erro: unknown): ErroMicrofone {
  const nome = (erro as { name?: string })?.name
  if (nome === 'NotAllowedError' || nome === 'SecurityError') return 'recusada'
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') return 'sem-microfone'
  // O microfone já está tomado por outra aplicação — acontece bastante no
  // Windows e quando há uma chamada a decorrer.
  if (nome === 'NotReadableError' || nome === 'AbortError') return 'ocupado'
  return 'desconhecido'
}

export async function abrirMicrofone(ambiente: AmbienteAudio): Promise<Captura> {
  if (!ambiente.contextoSeguro) throw new FalhaDoMicrofone('contexto-inseguro')

  // Perguntar antes de pedir: se já está negado, o getUserMedia falha em
  // silêncio nalguns browsers (sem sequer mostrar a caixa), e a pessoa
  // fica a carregar no botão sem perceber porquê. Sabendo que está
  // bloqueado, diz-se-lhe que tem de ir às definições do site.
  const estado = await ambiente.estadoDaPermissao()
  if (estado === 'denied') throw new FalhaDoMicrofone('bloqueada')

  let stream: MediaStream
  try {
    stream = await ambiente.pedirMicrofone()
  } catch (erro) {
    const motivo = traduzirFalha(erro)
    // Se recusou agora mas o estado já era "denied", é bloqueio
    // permanente e não uma recusa desta vez.
    if (motivo === 'recusada' && (await ambiente.estadoDaPermissao()) === 'denied') {
      throw new FalhaDoMicrofone('bloqueada', erro)
    }
    throw new FalhaDoMicrofone(motivo, erro)
  }

  const ctx = ambiente.criarContexto()
  // O Safari cria o contexto suspenso mesmo dentro de um gesto do
  // utilizador. Sem este resume, o grafo existe e nunca corre.
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // Se não retomar, o RMS fica a zero e o ecrã mostra "sinal fraco",
      // que é o comportamento certo — não vale a pena rebentar aqui.
    }
  }

  const origem = ctx.createMediaStreamSource(stream)
  const graves = ctx.createBiquadFilter()
  graves.type = 'highpass'
  graves.frequency.value = CORTE_GRAVE_HZ
  const agudos = ctx.createBiquadFilter()
  agudos.type = 'lowpass'
  agudos.frequency.value = CORTE_AGUDO_HZ
  const analisador = ctx.createAnalyser()
  analisador.fftSize = TAMANHO_BLOCO

  // Repare-se onde a cadeia acaba: no analisador. Nada liga ao
  // ctx.destination, por isso o que entra pelo microfone nunca sai pelos
  // altifalantes — não há realimentação nem escuta.
  origem.connect(graves)
  graves.connect(agudos)
  agudos.connect(analisador)

  let parado = false
  const interrupcoes: (() => void)[] = []
  const tracks = stream.getAudioTracks()

  // O sistema pode cortar a track por baixo dos pés: uma chamada a
  // entrar, outra app a tomar o microfone, o utilizador a revogar a
  // permissão a meio. Sem isto, o afinador ficava com ar de ligado a
  // mostrar "a ouvir…" para sempre.
  const aoTerminar = () => interrupcoes.forEach((f) => f())
  tracks.forEach((t) => t.addEventListener('ended', aoTerminar))

  return {
    taxaAmostragem: ctx.sampleRate,
    ler(destino) {
      if (parado) return
      analisador.getFloatTimeDomainData(destino)
    },
    aoInterromper(callback) {
      interrupcoes.push(callback)
    },
    parar() {
      if (parado) return
      parado = true
      tracks.forEach((t) => {
        t.removeEventListener('ended', aoTerminar)
        // Parar a track é o que apaga o indicador de microfone no
        // browser e no sistema. Fechar só o contexto não chega: a luz
        // ficava acesa com o afinador desligado.
        t.stop()
      })
      interrupcoes.length = 0
      try {
        origem.disconnect()
        graves.disconnect()
        agudos.disconnect()
      } catch {
        // Já desligado — não interessa.
      }
      void ctx.close()
    },
  }
}
