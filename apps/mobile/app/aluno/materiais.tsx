import { plural } from '@ccg/core'
import { useAudioPlayer } from 'expo-audio'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Cabecalho, Cartao } from '../../componentes/base'
import { espaco, raio, texto, tipos, type Cores } from '../../lib/tema'
import { useEstilos, useTema } from '../../lib/tema-contexto'

const BPM_MIN = 40
const BPM_MAX = 240
const COMPASSOS = [2, 3, 4, 6]

// O metrónomo. É o único material que a escola disponibiliza por agora —
// a página da web diz o mesmo, e diz também que partituras e trabalho de
// casa chegam depois.
//
// SOBRE A PRECISÃO, que é a diferença que interessa em relação à web:
// lá, a batida é agendada com o relógio do AudioContext, que é preciso
// ao nível da amostra. Aqui não há Web Audio; o que há é um temporizador
// do JavaScript. Para não acumular erro, cada batida é agendada a partir
// do instante teórico da anterior e não do momento em que a anterior
// correu — sem isso, um metrónomo a 120 bpm afasta-se segundos ao fim de
// poucos minutos.
//
// Continua a não ser um metrónomo de estúdio. Para estudar em casa serve;
// para gravar, não.
export default function Materiais() {
  const estilos = useEstilos(criarEstilos)
  const { nome } = useLocalSearchParams<{ nome?: string }>()

  const [bpm, setBpm] = useState(100)
  const [compasso, setCompasso] = useState(4)
  const [acentuar, setAcentuar] = useState(true)
  const [aTocar, setATocar] = useState(false)
  const [batida, setBatida] = useState(0)

  const acento = useAudioPlayer(require('../../assets/som/acento.wav'))
  const normal = useAudioPlayer(require('../../assets/som/batida.wav'))

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const proximaRef = useRef(0)
  const batidaRef = useRef(0)
  // Guardados em referência porque o ciclo de agendamento lê-os a cada
  // batida: se dependesse do estado, mudar o andamento a meio obrigava a
  // parar e recomeçar.
  const bpmRef = useRef(bpm)
  const compassoRef = useRef(compasso)
  const acentuarRef = useRef(acentuar)

  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])
  useEffect(() => {
    compassoRef.current = compasso
  }, [compasso])
  useEffect(() => {
    acentuarRef.current = acentuar
  }, [acentuar])

  const tocarUma = useCallback(() => {
    const numero = batidaRef.current % compassoRef.current
    const player = acentuarRef.current && numero === 0 ? acento : normal
    player.seekTo(0)
    player.play()
    setBatida(numero)
    batidaRef.current += 1
  }, [acento, normal])

  const parar = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = null
    setATocar(false)
    setBatida(0)
    batidaRef.current = 0
  }, [])

  const arrancar = useCallback(() => {
    batidaRef.current = 0
    proximaRef.current = Date.now()

    const ciclo = () => {
      tocarUma()
      // O instante da próxima batida sai do da anterior — não do relógio
      // de agora. É isto que impede o erro de se acumular.
      proximaRef.current += 60000 / bpmRef.current
      const espera = Math.max(0, proximaRef.current - Date.now())
      temporizador.current = setTimeout(ciclo, espera)
    }

    ciclo()
    setATocar(true)
  }, [tocarUma])

  // Parar quando o ecrã sai. Sem isto, o metrónomo continuava a tocar
  // com a app noutro sítio.
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current)
  }, [])

  return (
    <>
      <Stack.Screen options={{ title: 'Materiais' }} />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Cabecalho
          sobretitulo={nome ? `Caderno de ${nome}` : undefined}
          titulo="Materiais"
          descricao="Por agora, o metrónomo. Partituras e trabalho de casa chegam depois."
        />

        <Cartao>
          <View style={estilos.pontos}>
            {Array.from({ length: compasso }).map((_, i) => (
              <View
                key={i}
                style={[
                  estilos.ponto,
                  aTocar && batida === i && estilos.pontoAtivo,
                  i === 0 && acentuar && estilos.pontoAcento,
                  aTocar && batida === i && i === 0 && acentuar && estilos.pontoAcentoAtivo,
                ]}
              />
            ))}
          </View>

          <Text style={estilos.bpm}>{bpm}</Text>
          <Text style={estilos.bpmNota}>batidas por minuto</Text>

          <View style={estilos.controlos}>
            <Botao rotulo="−10" onPress={() => setBpm((b) => Math.max(BPM_MIN, b - 10))} />
            <Botao rotulo="−1" onPress={() => setBpm((b) => Math.max(BPM_MIN, b - 1))} />
            <Botao rotulo="+1" onPress={() => setBpm((b) => Math.min(BPM_MAX, b + 1))} />
            <Botao rotulo="+10" onPress={() => setBpm((b) => Math.min(BPM_MAX, b + 10))} />
          </View>
        </Cartao>

        <Cartao>
          <Text style={estilos.etiqueta}>Compasso</Text>
          <View style={estilos.controlos}>
            {COMPASSOS.map((c) => (
              <Botao
                key={c}
                rotulo={`${c}`}
                ativo={compasso === c}
                onPress={() => {
                  setCompasso(c)
                  batidaRef.current = 0
                }}
                acessivel={plural(c, 'batida por compasso', 'batidas por compasso')}
              />
            ))}
          </View>

          <Pressable
            onPress={() => setAcentuar((a) => !a)}
            accessibilityRole="switch"
            accessibilityState={{ checked: acentuar }}
            accessibilityLabel="Acentuar a primeira batida"
            style={estilos.acento}
          >
            <Text style={estilos.acentoTexto}>Acentuar a primeira batida</Text>
            <View style={[estilos.interruptor, acentuar && estilos.interruptorLigado]}>
              <View style={[estilos.bolinha, acentuar && estilos.bolinhaLigada]} />
            </View>
          </Pressable>
        </Cartao>

        <Pressable
          onPress={aTocar ? parar : arrancar}
          accessibilityRole="button"
          accessibilityLabel={aTocar ? 'Parar o metrónomo' : 'Começar o metrónomo'}
          style={({ pressed }) => [
            estilos.principal,
            aTocar && estilos.principalATocar,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={estilos.principalTexto}>{aTocar ? 'Parar' : 'Começar'}</Text>
        </Pressable>
      </ScrollView>
    </>
  )
}

function Botao({
  rotulo,
  onPress,
  ativo,
  acessivel,
}: {
  rotulo: string
  onPress: () => void
  ativo?: boolean
  acessivel?: string
}) {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={acessivel ?? rotulo}
      accessibilityState={{ selected: ativo }}
      style={[estilos.botao, ativo && estilos.botaoAtivo]}
    >
      <Text style={[estilos.botaoTexto, ativo && { color: cores.sobreAcento }]}>{rotulo}</Text>
    </Pressable>
  )
}

const criarEstilos = (cores: Cores) => StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  pontos: { flexDirection: 'row', gap: espaco.s, justifyContent: 'center', marginBottom: espaco.m },
  ponto: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: cores.linha,
  },
  pontoAcento: { borderWidth: 2, borderColor: cores.azulLogo },
  pontoAtivo: { backgroundColor: cores.azul, transform: [{ scale: 1.4 }] },
  pontoAcentoAtivo: { backgroundColor: cores.azulFundo },
  bpm: {
    ...texto.titulo,
    fontSize: 56,
    lineHeight: 62,
    color: cores.tinta,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  bpmNota: { ...texto.pequeno, color: cores.tintaSuave, textAlign: 'center' },
  controlos: { flexDirection: 'row', gap: espaco.xs, marginTop: espaco.m },
  botao: {
    flex: 1,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.botao,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.cartao,
  },
  botaoAtivo: { backgroundColor: cores.azulFundo, borderColor: cores.azulFundo },
  botaoTexto: { ...texto.corpo, fontFamily: tipos.corpoMedio, color: cores.tinta },
  etiqueta: { ...texto.etiqueta, color: cores.azulTexto },
  acento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espaco.m,
    minHeight: 44,
  },
  acentoTexto: { ...texto.corpo, color: cores.tinta },
  interruptor: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: cores.linha,
    padding: 3,
    justifyContent: 'center',
  },
  interruptorLigado: { backgroundColor: cores.azulFundo },
  bolinha: { width: 22, height: 22, borderRadius: 11, backgroundColor: cores.cartao },
  bolinhaLigada: { alignSelf: 'flex-end' },
  principal: {
    backgroundColor: cores.azulFundo,
    borderRadius: raio.pilula,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espaco.m,
  },
  principalATocar: { backgroundColor: cores.marcaVermelho },
  principalTexto: { ...texto.seccao, color: cores.sobreAcento },
})
