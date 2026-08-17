import { validarDataNascimento, validarNome } from '@ccg/core'
import { criarAluno } from '@ccg/data'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { Cabecalho } from '../../componentes/base'
import { BotaoPrincipal, Campo, Mensagem } from '../../componentes/formulario'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco } from '../../lib/tema'

export default function NovoAluno() {
  const router = useRouter()
  const { sessao } = useSessao()
  const [nome, setNome] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aCriar, setACriar] = useState(false)

  async function criar() {
    if (!sessao) return
    setErro(null)

    // Aqui a data é obrigatória, ao contrário do pop-up rápido da web:
    // é ela que decide os escalões de dança, e um aluno sem idade fica
    // a ver disciplinas para as quais pode não ter idade.
    const problema = validarNome(nome) ?? validarDataNascimento(dataNascimento, 'aluno')
    if (problema) {
      setErro(problema)
      return
    }

    setACriar(true)
    const { erro: falha } = await criarAluno(supabase, {
      encarregadoId: sessao.user.id,
      nome,
      dataNascimento,
    })
    setACriar(false)

    if (falha) {
      setErro(falha)
      return
    }

    router.back()
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Novo aluno' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <Cabecalho
            titulo="Novo aluno"
            descricao="Um aluno é quem tem as aulas. Podes criar um para cada filho, ou para ti."
          />

          <Campo
            etiqueta="Nome"
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
            autoFocus
          />
          <Campo
            etiqueta="Data de nascimento"
            value={dataNascimento}
            onChangeText={setDataNascimento}
            placeholder="AAAA-MM-DD"
            ajuda="Decide as disciplinas disponíveis — as turmas de dança são por escalão etário."
            keyboardType="numbers-and-punctuation"
          />

          {erro ? <Mensagem texto={erro} tom="erro" /> : null}

          <BotaoPrincipal texto="Criar aluno" onPress={criar} ocupado={aCriar} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espaco.m,
    gap: espaco.m,
    paddingBottom: espaco.xxl,
    backgroundColor: cores.papel,
  },
})
