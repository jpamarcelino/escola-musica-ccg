import { forwardRef } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { cores, espaco, raio, texto } from '../lib/tema'

// As peças de formulário, num sítio só. A app passa a escrever, e um
// campo de texto que se comporta de maneira diferente em cada ecrã é
// como se instala a confusão.

export const Campo = forwardRef<TextInput, TextInputProps & {
  etiqueta: string
  ajuda?: string
}>(function Campo({ etiqueta, ajuda, style, ...props }, ref) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        ref={ref}
        style={[estilos.input, style]}
        placeholderTextColor={cores.tintaSuave}
        // O rótulo visível serve também de nome acessível — senão um
        // leitor de ecrã anuncia "campo de texto" e mais nada.
        accessibilityLabel={etiqueta}
        {...props}
      />
      {ajuda ? <Text style={estilos.ajuda}>{ajuda}</Text> : null}
    </View>
  )
})

export function BotaoPrincipal({
  texto: rotulo,
  onPress,
  ocupado,
  desativado,
}: {
  texto: string
  onPress: () => void
  ocupado?: boolean
  desativado?: boolean
}) {
  const inativo = ocupado || desativado
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: !!inativo, busy: !!ocupado }}
      style={({ pressed }) => [
        estilos.botao,
        pressed && { opacity: 0.85 },
        inativo && { opacity: 0.5 },
      ]}
    >
      {ocupado ? (
        <ActivityIndicator color={cores.branco} />
      ) : (
        <Text style={estilos.botaoTexto}>{rotulo}</Text>
      )}
    </Pressable>
  )
}

export function BotaoSecundario({
  texto: rotulo,
  onPress,
  tom = 'normal',
}: {
  texto: string
  onPress: () => void
  tom?: 'normal' | 'destrutivo'
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.secundario, pressed && { opacity: 0.7 }]}
    >
      <Text
        style={[
          estilos.secundarioTexto,
          tom === 'destrutivo' && { color: cores.erro },
        ]}
      >
        {rotulo}
      </Text>
    </Pressable>
  )
}

// Erros e confirmações usam `accessibilityLiveRegion` para serem lidos
// quando aparecem — sem isso, quem usa leitor de ecrã submete o
// formulário e não recebe resposta nenhuma.
export function Mensagem({ texto: conteudo, tom }: { texto: string; tom: 'erro' | 'sucesso' }) {
  return (
    <View style={[estilos.mensagem, tom === 'erro' ? estilos.mensagemErro : estilos.mensagemOk]}>
      <Text
        style={[estilos.mensagemTexto, { color: tom === 'erro' ? cores.erro : cores.positivo }]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        {conteudo}
      </Text>
    </View>
  )
}

const estilos = StyleSheet.create({
  campo: { gap: espaco.xs },
  etiqueta: { ...texto.pequeno, fontFamily: 'Geist_600SemiBold', color: cores.tinta },
  input: {
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.botao,
    paddingHorizontal: espaco.m,
    // 48 pontos é o mínimo confortável para um dedo, o mesmo que a web
    // usa nos seus campos.
    height: 48,
    ...texto.corpo,
    color: cores.tinta,
    backgroundColor: cores.branco,
  },
  ajuda: { ...texto.pequeno, color: cores.tintaSuave },
  botao: {
    backgroundColor: cores.azulFundo,
    borderRadius: raio.botao,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: { ...texto.corpo, fontFamily: 'Geist_600SemiBold', color: cores.branco },
  secundario: { paddingVertical: espaco.s + 4, alignItems: 'center' },
  secundarioTexto: { ...texto.corpo, color: cores.azulTexto },
  mensagem: { borderRadius: raio.botao, padding: espaco.m, borderWidth: 1 },
  mensagemErro: { backgroundColor: '#F7E9E6', borderColor: '#E4C7C1' },
  mensagemOk: { backgroundColor: '#E8F1EC', borderColor: '#C6DCCF' },
  mensagemTexto: { ...texto.pequeno },
})
