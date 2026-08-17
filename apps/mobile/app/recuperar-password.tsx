import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { Cabecalho } from '../componentes/base'
import { BotaoPrincipal, BotaoSecundario, Campo, Mensagem } from '../componentes/formulario'
import { supabase } from '../lib/supabase'
import { cores, espaco } from '../lib/tema'

export default function RecuperarPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [aEnviar, setAEnviar] = useState(false)

  async function enviar() {
    setErro(null)
    setInfo(null)

    if (!email.trim()) {
      setErro('Introduz o teu email.')
      return
    }

    setAEnviar(true)
    // Sem `redirectTo`: o Supabase usa o endereço do site configurado no
    // projeto, que é a web. A pessoa define a nova password no browser e
    // volta aqui para entrar. Apontar o link para a app exigiria registar
    // um esquema novo nas definições do Supabase, e isso é uma alteração
    // de configuração do projeto, não uma decisão de código.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setAEnviar(false)

    if (error) {
      setErro('Não foi possível enviar o email. Tenta novamente.')
      return
    }

    // A mesma resposta quer o email exista quer não. Dizer "esse email
    // não está registado" contaria a quem tenta adivinhar que outro está.
    setInfo(
      'Se houver uma conta com esse email, enviámos uma mensagem com as instruções. ' +
        'O link abre no browser; depois de definires a password, volta aqui para entrar.'
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <Cabecalho
            titulo="Recuperar password"
            descricao="Escreve o email da tua conta e enviamos as instruções."
          />

          <Campo
            etiqueta="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="nome@exemplo.pt"
            onSubmitEditing={enviar}
            returnKeyType="send"
          />

          {erro ? <Mensagem texto={erro} tom="erro" /> : null}
          {info ? <Mensagem texto={info} tom="sucesso" /> : null}

          <BotaoPrincipal texto="Enviar instruções" onPress={enviar} ocupado={aEnviar} />
          <BotaoSecundario texto="Voltar a entrar" onPress={() => router.replace('/entrar')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

const estilos = StyleSheet.create({
  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: espaco.l,
    gap: espaco.m,
    backgroundColor: cores.papel,
  },
})
