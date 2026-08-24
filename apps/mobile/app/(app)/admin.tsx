import { plural } from '@ccg/core'
import { numerosDaEscola, type NumerosDaEscola } from '@ccg/data'
import { Link, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ACarregar } from '../../componentes/base'
import { usePerfil } from '../../lib/perfil'
import { supabase } from '../../lib/supabase'
import { espaco, raio, texto, type Cores } from '../../lib/tema'
import { useEstilos, useTema } from '../../lib/tema-contexto'

// A escola vista de cima.
//
// Mesma hierarquia das outras homes: o que precisa de resposta primeiro,
// em vermelho, com a ação lá dentro; os números a seguir, em mono, que é
// o que se vem aqui ver; e no fim as portas para gerir. Sem etiquetas em
// caixa alta e sem cartões todos do mesmo peso.

export default function Admin() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const { perfil } = usePerfil()
  const router = useRouter()
  const [numeros, setNumeros] = useState<NumerosDaEscola | null>(null)
  const [aCarregar, setACarregar] = useState(true)
  const [aRecarregar, setARecarregar] = useState(false)

  const carregar = useCallback(async () => {
    setNumeros(await numerosDaEscola(supabase))
  }, [])

  useEffect(() => {
    let ativo = true
    const buscar = async () => {
      await carregar()
      if (ativo) setACarregar(false)
    }
    void buscar()
    return () => {
      ativo = false
    }
  }, [carregar])

  if (aCarregar || !numeros) return <ACarregar />

  // Um de cada vez, o mais antigo à espera primeiro. Dois cartões
  // vermelhos lado a lado não são duas urgências: são uma parede.
  const resposta =
    numeros.pedidosPendentes > 0
      ? {
          texto: plural(
            numeros.pedidosPendentes,
            'pedido por confirmar',
            'pedidos por confirmar'
          ),
          destino: '/admin/alunos' as const,
          acao: 'Ver alunos',
        }
      : numeros.recomendacoesPorValidar > 0
        ? {
            texto: plural(
              numeros.recomendacoesPorValidar,
              'recomendação por validar',
              'recomendações por validar'
            ),
            destino: '/admin/recomendacoes' as const,
            acao: 'Validar',
          }
        : null

  return (
    <ScrollView
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl
          refreshing={aRecarregar}
          onRefresh={() => {
            setARecarregar(true)
            carregar().finally(() => setARecarregar(false))
          }}
          tintColor={cores.ciano}
        />
      }
    >
      <View style={estilos.cabecalho}>
        <Text style={estilos.sobretitulo}>Administração</Text>
        <Text style={estilos.nome}>{primeiroNome(perfil?.nome)}</Text>
      </View>

      {resposta ? (
        <Pressable
          onPress={() => router.push(resposta.destino)}
          accessibilityRole="button"
          accessibilityLabel={`${resposta.texto}. ${resposta.acao}.`}
          style={estilos.precisa}
        >
          <View style={{ flex: 1 }}>
            <Text style={estilos.precisaTexto}>{resposta.texto}</Text>
            <Text style={estilos.precisaAcao}>{resposta.acao} →</Text>
          </View>
        </Pressable>
      ) : null}

      {/* Uma linha de quatro e não uma grelha de cartões: os números
          comparam-se entre si, e cada um dentro da sua caixa obrigava a
          saltar de caixa em caixa para os ler em conjunto. */}
      <View style={estilos.numeros}>
        <Numero valor={numeros.alunos} rotulo={numeros.alunos === 1 ? 'aluno' : 'alunos'} />
        <View style={estilos.divisor} />
        <Numero
          valor={numeros.professores}
          rotulo={numeros.professores === 1 ? 'professor' : 'professores'}
        />
        <View style={estilos.divisor} />
        <Numero valor={numeros.contas} rotulo={numeros.contas === 1 ? 'conta' : 'contas'} />
        <View style={estilos.divisor} />
        <Numero
          valor={numeros.matriculasConfirmadas}
          rotulo={numeros.matriculasConfirmadas === 1 ? 'aula' : 'aulas'}
        />
      </View>

      <Text style={estilos.seccao}>Gerir</Text>
      <Atalho href="/admin/alunos" titulo="Alunos" nota="Toda a gente que tem aulas" />
      <Atalho href="/admin/professores" titulo="Professores" nota="Quem dá aulas, e em que escola" />
      <Atalho href="/admin/recomendacoes" titulo="Recomendações" nota="Validar e anular" />

      {/* Onde a app não vai, e porquê. Sem isto, um administrador procura
          os pagamentos aqui e conclui que a app está partida. */}
      <View style={estilos.nota}>
        <Text style={estilos.notaTexto}>
          Pagamentos, faturação e o estudo das recomendações continuam no site: são
          tabelas largas, de conferir com calma, e num telemóvel dariam mais erros
          do que rapidez.
        </Text>
      </View>
    </ScrollView>
  )

  function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
    return (
      <View style={estilos.numero}>
        <Text style={[estilos.numeroValor, { color: cores.ciano }]}>{valor}</Text>
        <Text style={estilos.numeroRotulo}>{rotulo}</Text>
      </View>
    )
  }
}

function Atalho({ href, titulo, nota }: { href: string; titulo: string; nota: string }) {
  const estilos = useEstilos(criarEstilos)
  return (
    <Link href={href as never} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={titulo} style={estilos.linha}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.linhaTitulo}>{titulo}</Text>
          <Text style={estilos.linhaDetalhe}>{nota}</Text>
        </View>
        <Text style={estilos.seta}>›</Text>
      </Pressable>
    </Link>
  )
}

function primeiroNome(nome: string | undefined): string {
  if (!nome) return 'Escola'
  return nome.trim().split(/\s+/)[0]
}

const criarEstilos = (cores: Cores) =>
  StyleSheet.create({
    conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },

    cabecalho: { marginBottom: espaco.s },
    sobretitulo: { ...texto.pequeno, color: cores.tintaSuave },
    nome: { ...texto.titulo, color: cores.tinta },

    precisa: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      padding: espaco.m,
      borderRadius: raio.cartao,
      borderWidth: 1,
      borderColor: cores.alertaLinha,
      backgroundColor: cores.alertaFundo,
    },
    precisaTexto: { ...texto.cartao, color: cores.alerta },
    precisaAcao: { ...texto.pequeno, color: cores.alerta, marginTop: 2 },

    numeros: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: espaco.m,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: cores.linha,
    },
    numero: { flex: 1, gap: 2 },
    numeroValor: { ...texto.numero, fontSize: 26, lineHeight: 32 },
    numeroRotulo: { ...texto.pequeno, fontSize: 11, color: cores.tintaSuave },
    divisor: { width: 1, height: 30, backgroundColor: cores.linha },

    seccao: { ...texto.seccao, color: cores.tintaSuave, marginTop: espaco.m },
    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espaco.m,
      minHeight: 64,
      paddingHorizontal: espaco.m,
      paddingVertical: espaco.s,
      borderRadius: raio.cartao,
      backgroundColor: cores.cartao,
      borderWidth: 1,
      borderColor: cores.linha,
    },
    linhaTitulo: { ...texto.cartao, color: cores.tinta },
    linhaDetalhe: { ...texto.pequeno, color: cores.tintaSuave },
    seta: { fontSize: 20, color: cores.tintaSuave },

    nota: {
      marginTop: espaco.l,
      padding: espaco.m,
      borderRadius: raio.cartao,
      backgroundColor: cores.cartaoSuave,
    },
    notaTexto: { ...texto.pequeno, color: cores.tintaSuave },
  })
