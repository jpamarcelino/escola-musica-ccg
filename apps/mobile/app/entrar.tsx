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
import { BotaoSecundario } from '../componentes/formulario'
import { supabase } from '../lib/supabase'
import { espaco, raio, texto, tipos, type Cores } from '../lib/tema'
import { useEstilos, useTema } from '../lib/tema-contexto'

export default function Entrar() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
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

    router.replace('/')
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
            placeholderTextColor={cores.tintaSuave}
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
            <ActivityIndicator color={cores.sobreAcento} />
          ) : (
            <Text style={estilos.botaoTexto}>Entrar</Text>
          )}
        </Pressable>

        {/* Sem estas duas saídas a app era um beco: quem não tinha conta
            não a podia criar, e quem esquecia a password ficava preso. */}
        <BotaoSecundario
          texto="Esqueci-me da password"
          onPress={() => router.push('/recuperar-password')}
        />
        <Text style={estilos.separador}>Ainda não tens conta?</Text>
        <BotaoSecundario texto="Criar conta" onPress={() => router.push('/registo')} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const criarEstilos = (cores: Cores) => StyleSheet.create({
  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: espaco.l,
    gap: espaco.m,
    backgroundColor: cores.papel,
  },
  titulo: { ...texto.titulo, fontSize: 32, lineHeight: 38, color: cores.tinta },
  subtitulo: { ...texto.corpo, color: cores.tintaSuave, marginBottom: espaco.l },
  campo: { gap: espaco.xs },
  etiqueta: { ...texto.pequeno, fontFamily: tipos.corpoMedio, color: cores.tinta },
  input: {
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.botao,
    paddingHorizontal: espaco.m,
    // 48 pontos de altura: é o mínimo confortável para um dedo, o mesmo
    // que a web usa nos seus campos.
    height: 48,
    ...texto.corpo,
    color: cores.tinta,
    backgroundColor: cores.cartao,
  },
  erro: { ...texto.pequeno, color: cores.erro },
  botao: {
    backgroundColor: cores.azulFundo,
    borderRadius: raio.botao,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espaco.s,
  },
  botaoTexto: { ...texto.corpo, fontFamily: tipos.corpoMedio, color: cores.sobreAcento },
  separador: {
    ...texto.pequeno,
    color: cores.tintaSuave,
    textAlign: 'center',
    marginTop: espaco.s,
  },
})
