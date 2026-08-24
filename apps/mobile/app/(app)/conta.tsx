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
  Switch,
  Text,
  View,
} from 'react-native'
import { Cabecalho, Cartao, Distintivo } from '../../componentes/base'
import { BotaoPrincipal, Campo, Mensagem } from '../../componentes/formulario'
import { useModo } from '../../lib/modo'
import { usePerfil } from '../../lib/perfil'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { espaco, raio, texto, type Cores } from '../../lib/tema'
import { APARENCIAS, useEstilos, useTema } from '../../lib/tema-contexto'
import { TEXTOS_LEGAIS } from '@ccg/core'

type Secao = 'nome' | 'email' | 'password' | null

export default function Conta() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const router = useRouter()
  const { sessao } = useSessao()
  const { perfil } = usePerfil()
  const { modoAdmin, podeAlternar, alternar } = useModo()
  const { aparencia, esquema, definir: definirAparencia } = useTema()

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
    // Duas confirmações, e a primeira diz o que ACONTECE MESMO.
    //
    // O texto anterior — "apaga os alunos, as matrículas e o histórico de
    // presenças, não há forma de recuperar" — era falso: a base conserva
    // presenças e mensalidades por obrigação contabilística e legal.
    // Prometer no ecrã um apagamento que a base não executa é pior do que
    // não prometer nada. O texto é agora o mesmo da web, vindo de
    // @ccg/core para não voltarem a divergir.
    Alert.alert(
      'Apagar a tua conta?',
      TEXTOS_LEGAIS.apagarConta,
      [
        { text: 'Manter conta', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Tens a certeza?', 'Esta é a última pergunta.', [
              { text: 'Não', style: 'cancel' },
              {
                text: 'Apagar conta',
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

  function trocarModo(ligado: boolean) {
    alternar(ligado)
    // Trocar a barra por baixo dos pés e deixar a pessoa na Conta seria
    // desorientador: os separadores mudam todos e o ecrã fica igual.
    // Levá-la ao primeiro ecrã do modo novo mostra o que mudou.
    router.replace(ligado ? '/admin' : '/')
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

        {podeAlternar ? (
          <Cartao>
            <View style={estilos.modoTopo}>
              <View style={estilos.modoTexto}>
                <Text style={estilos.linhaTitulo}>Modo de administração</Text>
                <Text style={estilos.modoNota}>
                  {modoAdmin
                    ? 'A app está a mostrar a escola inteira. Desliga para voltares às tuas aulas.'
                    : 'Liga para gerires alunos, professores e recomendações.'}
                </Text>
              </View>
              <Switch
                value={modoAdmin}
                onValueChange={trocarModo}
                accessibilityLabel="Modo de administração"
                trackColor={{ true: cores.azulFundo, false: cores.linha }}
              />
            </View>
          </Cartao>
        ) : null}

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

        <Cartao>
          <Text style={estilos.linhaTitulo}>Aparência</Text>
          <Text style={estilos.modoNota}>
            Fica guardada neste telemóvel e mantém-se depois de fechares a app.
          </Text>
          {/* radiogroup e não três botões soltos: só uma pode estar
              escolhida, e é isso que faz o leitor de ecrã anunciar
              "1 de 3" em vez de três botões sem relação entre si. */}
          <View
            style={estilos.aparencias}
            accessibilityRole="radiogroup"
            accessibilityLabel="Aparência da app"
          >
            {APARENCIAS.map((a) => {
              const escolhida = aparencia === a.valor
              return (
                <Pressable
                  key={a.valor}
                  onPress={() => definirAparencia(a.valor)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: escolhida }}
                  accessibilityLabel={`${a.rotulo}. ${a.nota}`}
                  style={[estilos.aparencia, escolhida && estilos.aparenciaEscolhida]}
                >
                  <Text style={[estilos.aparenciaRotulo, escolhida && estilos.aparenciaRotuloEscolhido]}>
                    {a.rotulo}
                  </Text>
                  <Text style={[estilos.aparenciaNota, escolhida && estilos.aparenciaRotuloEscolhido]}>
                    {a.nota}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {/* Com "Sistema" escolhido, dizer o que o sistema está a
              mandar: senão a pessoa carrega em Sistema, não vê nada
              mudar (porque já coincidia) e conclui que não funcionou. */}
          {aparencia === 'sistema' ? (
            <Text style={estilos.modoNota}>
              O telemóvel está em modo {esquema === 'escuro' ? 'escuro' : 'claro'}.
            </Text>
          ) : null}
        </Cartao>

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
  const estilos = useEstilos(criarEstilos)
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

const criarEstilos = (cores: Cores) => StyleSheet.create({
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
  modoTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, minHeight: 44 },
  modoTexto: { flex: 1, gap: 2 },
  modoNota: { ...texto.pequeno, color: cores.tintaSuave },
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
  aparencias: { flexDirection: 'row', gap: espaco.xs, marginTop: espaco.s },
  aparencia: {
    flex: 1,
    minHeight: 64,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: espaco.s,
    paddingVertical: espaco.s,
    borderWidth: 1.5,
    borderColor: cores.linha,
    borderRadius: raio.botao,
  },
  aparenciaEscolhida: { borderColor: cores.azulFundo, backgroundColor: cores.papel2 },
  aparenciaRotulo: { ...texto.cartao, color: cores.tinta },
  aparenciaRotuloEscolhido: { color: cores.azulTexto },
  aparenciaNota: { ...texto.pequeno, fontSize: 12, lineHeight: 16, color: cores.tintaSuave },
  apagar: { padding: espaco.m, alignItems: 'center', marginTop: espaco.s },
  apagarTexto: { ...texto.pequeno, color: cores.erro },
})
