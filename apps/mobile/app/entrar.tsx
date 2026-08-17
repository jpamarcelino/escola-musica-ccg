import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { cores, espaco, raio } from '../lib/tema'

export default function Entrar() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aEntrar, setAEntrar] = useState(false)

  async function entrar() {
    setErro(null)

    if (!email.trim() || !password) {
      setErro('Preenche os dois campos.')
      return
    }

    setAEntrar(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setAEntrar(false)

    if (error) {
      // A mesma mensagem para email errado e password errada, tal como na
      // web: dizer qual dos dois falhou diz a quem tenta adivinhar que
      // aquele email existe.
      setErro('Email ou password incorretos.')
      return
    }

    router.replace('/alunos')
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={estilos.titulo}>Escolas Artísticas</Text>
        <Text style={estilos.subtitulo}>Centro Cultural da Guarda</Text>

        <View style={estilos.campo}>
          <Text style={estilos.etiqueta}>Email</Text>
          <TextInput
            style={estilos.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="nome@exemplo.pt"
            placeholderTextColor={cores.textoSuave}
          />
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.etiqueta}>Password</Text>
          <TextInput
            style={estilos.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            onSubmitEditing={entrar}
            returnKeyType="go"
          />
        </View>

        {erro ? (
          <Text style={estilos.erro} accessibilityLiveRegion="polite">
            {erro}
          </Text>
        ) : null}

        <Pressable
          onPress={entrar}
          disabled={aEntrar}
          accessibilityRole="button"
          style={({ pressed }) => [
            estilos.botao,
            pressed && { opacity: 0.85 },
            aEntrar && { opacity: 0.6 },
          ]}
        >
          {aEntrar ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={estilos.botaoTexto}>Entrar</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: espaco.l,
    gap: espaco.m,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: cores.texto,
  },
  subtitulo: {
    fontSize: 16,
    color: cores.textoSuave,
    marginBottom: espaco.l,
  },
  campo: { gap: espaco.xs },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: cores.texto,
  },
  input: {
    borderWidth: 1,
    borderColor: cores.contorno,
    borderRadius: raio.cartao,
    paddingHorizontal: espaco.m,
    // 48 pontos de altura: é o mínimo confortável para um dedo, o mesmo
    // que a web usa nos seus campos.
    height: 48,
    fontSize: 16,
    color: cores.texto,
    backgroundColor: cores.superficie,
  },
  erro: {
    color: cores.vermelho,
    fontSize: 14,
  },
  botao: {
    backgroundColor: cores.cianoTexto,
    borderRadius: raio.botao,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espaco.s,
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
