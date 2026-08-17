import {
  apagarPropriaConta,
  atualizarEmail,
  atualizarNome,
  atualizarPassword,
  ehContaCcg,
  ehProfessor,
} from '@ccg/data'
import type { PerfisEscolaTipo } from '@ccg/types'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Cabecalho, Cartao, Distintivo } from '../../componentes/base'
import { BotaoPrincipal, Campo, Mensagem } from '../../componentes/formulario'
import { usePerfil } from '../../lib/perfil'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco, raio, texto } from '../../lib/tema'

type Secao = 'nome' | 'email' | 'password' | null

export default function Conta() {
  const router = useRouter()
  const { sessao } = useSessao()
  const { perfil } = usePerfil()

  // Uma secção aberta de cada vez. Três formulários todos abertos num
  // ecrã de telemóvel é uma parede de campos onde ninguém percebe o que
  // é que o botão vai gravar.
  const [aberta, setAberta] = useState<Secao>(null)
  const [nome, setNome] = useState(perfil?.nome ?? '')
  const [email, setEmail] = useState('')
  const [passwordAtual, setPasswordAtual] = useState('')
  const [passwordNova, setPasswordNova] = useState('')
  const [passwordRepetir, setPasswordRepetir] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const contaCcg = ehContaCcg(perfil?.tipo)

  function limpar() {
    setErro(null)
    setInfo(null)
  }

  async function guardarNome() {
    if (!sessao) return
    limpar()
    setOcupado(true)
    const { erro: falha } = await atualizarNome(supabase, sessao.user.id, nome)
    setOcupado(false)
    if (falha) setErro(falha)
    else {
      setInfo('Nome atualizado. Aparece atualizado da próxima vez que entrares.')
      setAberta(null)
    }
  }

  async function guardarEmail() {
    limpar()
    setOcupado(true)
    const { erro: falha } = await atualizarEmail(supabase, perfil?.tipo ?? null, email)
    setOcupado(false)
    if (falha) setErro(falha)
    else {
      // O email só muda depois de confirmado no endereço novo. Dizê-lo
      // evita que a pessoa tente entrar com ele e conclua que falhou.
      setInfo('Enviámos uma mensagem para o email novo. Confirma-a para a mudança valer.')
      setAberta(null)
      setEmail('')
    }
  }

  async function guardarPassword() {
    if (!sessao?.user.email) return
    limpar()
    setOcupado(true)
    const { erro: falha } = await atualizarPassword(supabase, {
      email: sessao.user.email,
      atual: passwordAtual,
      nova: passwordNova,
      repetir: passwordRepetir,
    })
    setOcupado(false)
    if (falha) setErro(falha)
    else {
      setInfo('Password atualizada.')
      setAberta(null)
      setPasswordAtual('')
      setPasswordNova('')
      setPasswordRepetir('')
    }
  }

  function apagar() {
    // Duas confirmações, e a primeira diz o que se perde. Uma conta
    // apagada leva os alunos, as matrículas e as presenças — não há
    // volta e não há cópia.
    Alert.alert(
      'Apagar a tua conta?',
      'Apaga também os alunos a teu cargo, as matrículas e o histórico de presenças. ' +
        'Não há forma de recuperar.',
      [
        { text: 'Manter conta', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Tens a certeza?', 'Esta é a última pergunta.', [
              { text: 'Não', style: 'cancel' },
              {
                text: 'Apagar tudo',
                style: 'destructive',
                onPress: async () => {
                  setOcupado(true)
                  const { erro: falha } = await apagarPropriaConta(supabase)
                  setOcupado(false)
                  if (falha) setErro(falha)
                  else router.replace('/entrar')
                },
              },
            ]),
        },
      ]
    )
  }

  async function sair() {
    await supabase.auth.signOut()
    router.replace('/entrar')
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Cabecalho titulo="Conta" />

        <Cartao>
          <Text style={estilos.nome}>{perfil?.nome ?? 'Sem nome'}</Text>
          <Text style={estilos.email}>{sessao?.user.email}</Text>
          <View style={estilos.papeis}>
            <Distintivo texto={rotuloPapel(perfil?.tipo)} tom="azul" />
            {perfil?.admin ? <Distintivo texto="Administração" tom="neutro" /> : null}
          </View>
        </Cartao>

        {erro ? <Mensagem texto={erro} tom="erro" /> : null}
        {info ? <Mensagem texto={info} tom="sucesso" /> : null}

        <Linha
          titulo="Nome"
          aberta={aberta === 'nome'}
          abrir={() => {
            limpar()
            setAberta(aberta === 'nome' ? null : 'nome')
          }}
        >
          <Campo etiqueta="Nome" value={nome} onChangeText={setNome} autoCapitalize="words" />
          <BotaoPrincipal texto="Guardar nome" onPress={guardarNome} ocupado={ocupado} />
        </Linha>

        {contaCcg ? (
          <Linha
            titulo="Email"
            aberta={aberta === 'email'}
            abrir={() => {
              limpar()
              setAberta(aberta === 'email' ? null : 'email')
            }}
          >
            <Campo
              etiqueta="Novo email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              inputMode="email"
              ajuda="Recebes uma mensagem no endereço novo para confirmar."
            />
            <BotaoPrincipal texto="Mudar email" onPress={guardarEmail} ocupado={ocupado} />
          </Linha>
        ) : null}

        <Linha
          titulo="Password"
          aberta={aberta === 'password'}
          abrir={() => {
            limpar()
            setAberta(aberta === 'password' ? null : 'password')
          }}
        >
          <Campo
            etiqueta="Password atual"
            value={passwordAtual}
            onChangeText={setPasswordAtual}
            secureTextEntry
            autoComplete="current-password"
          />
          <Campo
            etiqueta="Password nova"
            value={passwordNova}
            onChangeText={setPasswordNova}
            secureTextEntry
            autoComplete="new-password"
          />
          <Campo
            etiqueta="Repetir a nova"
            value={passwordRepetir}
            onChangeText={setPasswordRepetir}
            secureTextEntry
            autoComplete="new-password"
          />
          <BotaoPrincipal texto="Mudar password" onPress={guardarPassword} ocupado={ocupado} />
        </Linha>

        <Pressable onPress={sair} accessibilityRole="button" style={estilos.sair}>
          <Text style={estilos.sairTexto}>Terminar sessão</Text>
        </Pressable>

        <Pressable onPress={apagar} accessibilityRole="button" style={estilos.apagar}>
          <Text style={estilos.apagarTexto}>Apagar a minha conta</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Linha({
  titulo,
  aberta,
  abrir,
  children,
}: {
  titulo: string
  aberta: boolean
  abrir: () => void
  children: React.ReactNode
}) {
  return (
    <Cartao>
      <Pressable
        onPress={abrir}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberta }}
        style={estilos.linhaTopo}
      >
        <Text style={estilos.linhaTitulo}>{titulo}</Text>
        <Text style={estilos.seta}>{aberta ? '–' : '+'}</Text>
      </Pressable>
      {aberta ? <View style={estilos.corpo}>{children}</View> : null}
    </Cartao>
  )
}

function rotuloPapel(tipo: PerfisEscolaTipo | null | undefined): string {
  if (ehProfessor(tipo)) return 'Professor'
  if (ehContaCcg(tipo)) return 'Conta CCG'
  if (tipo === 'admin') return 'Administração'
  return 'Sem perfil'
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  nome: { ...texto.seccao, color: cores.tinta },
  email: { ...texto.pequeno, color: cores.tintaSuave },
  papeis: { flexDirection: 'row', gap: espaco.xs, marginTop: espaco.xs },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  linhaTitulo: { ...texto.cartao, color: cores.tinta },
  seta: { fontSize: 24, color: cores.tintaSuave },
  corpo: { gap: espaco.m, marginTop: espaco.s },
  sair: {
    marginTop: espaco.l,
    padding: espaco.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.pilula,
  },
  sairTexto: { ...texto.corpo, color: cores.tinta },
  apagar: { padding: espaco.m, alignItems: 'center', marginTop: espaco.s },
  apagarTexto: { ...texto.pequeno, color: cores.erro },
})
