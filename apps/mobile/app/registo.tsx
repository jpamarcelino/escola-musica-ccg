import { validarRegisto } from '@ccg/core'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native'
import { Cabecalho } from '../componentes/base'
import { BotaoPrincipal, BotaoSecundario, Campo, Mensagem } from '../componentes/formulario'
import { supabase } from '../lib/supabase'
import { cores, espaco, texto } from '../lib/tema'

export default function Registo() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [convite, setConvite] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [aCriar, setACriar] = useState(false)

  async function criar() {
    setErro(null)
    setInfo(null)

    // As mesmas regras que a web aplica no signup — literalmente a mesma
    // função, do @ccg/core. Se um dia mudarem, mudam nos dois sítios.
    const problema = validarRegisto({ nome, email, password, telefone, dataNascimento })
    if (problema) {
      setErro(problema)
      return
    }

    setACriar(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nome: nome.trim(),
          data_nascimento: dataNascimento.trim(),
          telefone: telefone.trim(),
          // O código é revalidado no servidor pelo trigger
          // handle_new_user — aqui vai como veio, nunca é confiado.
          convite_codigo: convite.trim() || null,
        },
      },
    })
    setACriar(false)

    if (error) {
      setErro(error.message)
      return
    }

    // Com a confirmação de email ativa não há sessão nesta fase: a conta
    // existe mas ainda não se pode entrar. Dizê-lo evita que a pessoa
    // tente entrar e conclua que o registo falhou.
    if (!data.session) {
      setInfo('Conta criada. Verifica o teu email para a confirmares antes de entrares.')
      return
    }

    router.replace('/')
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
            sobretitulo="Escolas Artísticas"
            titulo="Criar conta"
            descricao="Uma conta serve para gerir os teus alunos e acompanhar as aulas."
          />

          <Campo
            etiqueta="Nome"
            value={nome}
            onChangeText={setNome}
            autoComplete="name"
            autoCapitalize="words"
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
          />
          <Campo
            etiqueta="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            ajuda="Pelo menos 6 caracteres."
          />
          <Campo
            etiqueta="Telemóvel"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="912 345 678"
          />
          <Campo
            etiqueta="Data de nascimento"
            value={dataNascimento}
            onChangeText={setDataNascimento}
            placeholder="AAAA-MM-DD"
            // Sem seletor de data nesta primeira versão: o campo aceita o
            // mesmo formato que a web, e a regra que o valida é a mesma.
            ajuda="No formato 2005-04-17."
            keyboardType="numbers-and-punctuation"
          />
          <Campo
            etiqueta="Código de convite"
            value={convite}
            onChangeText={setConvite}
            autoCapitalize="none"
            ajuda="Só se a escola te tiver enviado um. Deixa vazio se não tens."
          />

          {erro ? <Mensagem texto={erro} tom="erro" /> : null}
          {info ? <Mensagem texto={info} tom="sucesso" /> : null}

          <BotaoPrincipal texto="Criar conta" onPress={criar} ocupado={aCriar} />

          <Text style={estilos.ja}>Já tens conta?</Text>
          <BotaoSecundario texto="Entrar" onPress={() => router.replace('/entrar')} />
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
  ja: { ...texto.pequeno, color: cores.tintaSuave, textAlign: 'center', marginTop: espaco.s },
})
