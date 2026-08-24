import { plural } from '@ccg/core'
import { numerosDaEscola, type NumerosDaEscola } from '@ccg/data'
import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  ACarregar,
  Cabecalho,
  Cartao,
  CartaoTocavel,
  Distintivo,
} from '../../componentes/base'
import { usePerfil } from '../../lib/perfil'
import { supabase } from '../../lib/supabase'
import { espaco, texto, type Cores } from '../../lib/tema'
import { useEstilos, useTema } from '../../lib/tema-contexto'

export default function Admin() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const { perfil } = usePerfil()
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
          tintColor={cores.azulFundo}
        />
      }
    >
      <Cabecalho
        sobretitulo="Administração"
        titulo={primeiroNome(perfil?.nome)}
        descricao="A escola em números."
      />

      {/* O que precisa de atenção vem primeiro, e só aparece se existir.
          Um painel que mostra sempre "0 pedidos por confirmar" ensina a
          ignorá-lo. */}
      {(numeros.pedidosPendentes > 0 || numeros.recomendacoesPorValidar > 0) && (
        <View style={estilos.avisos}>
          {numeros.pedidosPendentes > 0 && (
            <Distintivo
              texto={plural(
                numeros.pedidosPendentes,
                'pedido por confirmar',
                'pedidos por confirmar'
              )}
              tom="aviso"
            />
          )}
          {numeros.recomendacoesPorValidar > 0 && (
            <Distintivo
              texto={plural(
                numeros.recomendacoesPorValidar,
                'recomendação por validar',
                'recomendações por validar'
              )}
              tom="azul"
            />
          )}
        </View>
      )}

      <View style={estilos.grelha}>
        <Numero valor={numeros.alunos} rotulo={palavraAlunos(numeros.alunos)} />
        <Numero valor={numeros.professores} rotulo={numeros.professores === 1 ? 'professor' : 'professores'} />
        <Numero valor={numeros.contas} rotulo={numeros.contas === 1 ? 'conta' : 'contas'} />
        <Numero
          valor={numeros.matriculasConfirmadas}
          rotulo={numeros.matriculasConfirmadas === 1 ? 'aula marcada' : 'aulas marcadas'}
        />
      </View>

      <Text style={estilos.seccao}>Gerir</Text>

      <Link href="/admin/alunos" asChild>
        <CartaoTocavel rotulo="Ver todos os alunos">
          <Text style={estilos.itemNome}>Alunos</Text>
          <Text style={estilos.itemNota}>Toda a gente que tem aulas</Text>
        </CartaoTocavel>
      </Link>

      <Link href="/admin/professores" asChild>
        <CartaoTocavel rotulo="Ver professores">
          <Text style={estilos.itemNome}>Professores</Text>
          <Text style={estilos.itemNota}>Quem dá aulas, e em que escola</Text>
        </CartaoTocavel>
      </Link>

      <Link href="/admin/recomendacoes" asChild>
        <CartaoTocavel rotulo="Ver recomendações">
          <Text style={estilos.itemNome}>Recomendações</Text>
          <Text style={estilos.itemNota}>Validar e anular</Text>
        </CartaoTocavel>
      </Link>

      {/* Onde a app não vai, e porquê. Sem isto, um administrador procura
          os pagamentos aqui e conclui que a app está partida. */}
      <Cartao style={estilos.nota}>
        <Text style={estilos.notaTexto}>
          Pagamentos, faturação e o estudo das recomendações continuam no site: são
          tabelas largas, de conferir com calma, e num telemóvel dariam mais erros
          do que rapidez.
        </Text>
      </Cartao>
    </ScrollView>
  )
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  const estilos = useEstilos(criarEstilos)
  return (
    <Cartao style={estilos.numero}>
      <Text style={estilos.numeroValor}>{valor}</Text>
      <Text style={estilos.numeroRotulo}>{rotulo}</Text>
    </Cartao>
  )
}

function palavraAlunos(n: number): string {
  return n === 1 ? 'aluno' : 'alunos'
}

function primeiroNome(nome: string | undefined): string {
  if (!nome) return 'Escola'
  return nome.trim().split(/\s+/)[0]
}

const criarEstilos = (cores: Cores) => StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  avisos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.xs, marginBottom: espaco.s },
  grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s },
  numero: { flexGrow: 1, flexBasis: '45%', alignItems: 'center' },
  numeroValor: {
    ...texto.titulo,
    fontSize: 32,
    lineHeight: 38,
    color: cores.azulFundo,
    fontVariant: ['tabular-nums'],
  },
  numeroRotulo: { ...texto.pequeno, color: cores.tintaSuave },
  seccao: { ...texto.seccao, color: cores.tinta, marginTop: espaco.l },
  itemNome: { ...texto.cartao, color: cores.tinta },
  itemNota: { ...texto.pequeno, color: cores.tintaSuave },
  nota: { marginTop: espaco.l, backgroundColor: cores.papel2 },
  notaTexto: { ...texto.pequeno, color: cores.tintaSuave },
})
