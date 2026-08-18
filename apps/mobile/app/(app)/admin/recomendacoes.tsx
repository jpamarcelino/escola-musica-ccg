import { formatarDataEscolar, plural } from '@ccg/core'
import {
  anularRecomendacao,
  listarRecomendacoes,
  validarRecomendacao,
  type RecomendacaoAdmin,
} from '@ccg/data'
import type { RecomendacaoEstado } from '@ccg/types'
import { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { FlatList } from 'react-native'
import {
  ACarregar,
  Cabecalho,
  Cartao,
  Distintivo,
  EstadoVazio,
  type TomDistintivo,
} from '../../../componentes/base'
import { BotaoPrincipal, BotaoSecundario, Campo, Mensagem } from '../../../componentes/formulario'
import { supabase } from '../../../lib/supabase'
import { cores, espaco, texto } from '../../../lib/tema'

const ROTULO: Record<RecomendacaoEstado, string> = {
  registada: 'Por validar',
  validada: 'Validada',
  anulada: 'Anulada',
}

const TOM: Record<RecomendacaoEstado, TomDistintivo> = {
  registada: 'aviso',
  validada: 'positivo',
  anulada: 'neutro',
}

export default function Recomendacoes() {
  const [lista, setLista] = useState<RecomendacaoAdmin[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [aAnular, setAAnular] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLista(await listarRecomendacoes(supabase))
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

  function validar(r: RecomendacaoAdmin) {
    // Validar desbloqueia o benefício de quem recomendou — é uma escrita
    // com consequência em dinheiro, e por isso pergunta primeiro.
    Alert.alert(
      'Validar esta recomendação?',
      `${r.recomendador_nome} passa a ter direito ao benefício por ter trazido ` +
        `${r.novo_aluno_nome}.`,
      [
        { text: 'Ainda não', style: 'cancel' },
        {
          text: 'Validar',
          onPress: async () => {
            setErro(null)
            setOcupado(r.id)
            const { erro: falha } = await validarRecomendacao(supabase, r.id)
            if (falha) setErro(falha)
            else await carregar()
            setOcupado(null)
          },
        },
      ]
    )
  }

  async function anular(id: number) {
    setErro(null)
    setOcupado(id)
    const { erro: falha } = await anularRecomendacao(supabase, id, motivo)
    if (falha) {
      setErro(falha)
    } else {
      setAAnular(null)
      setMotivo('')
      await carregar()
    }
    setOcupado(null)
  }

  if (aCarregar) return <ACarregar />

  const porValidar = lista.filter((r) => r.estado === 'registada').length

  return (
    <>
      <FlatList
        data={lista}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={estilos.lista}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <Cabecalho
              titulo="Recomendações"
              descricao={
                porValidar > 0
                  ? plural(porValidar, 'por validar', 'por validar')
                  : 'Nada por validar.'
              }
            />
            {erro ? <Mensagem texto={erro} tom="erro" /> : null}
          </>
        }
        ListEmptyComponent={
          <EstadoVazio
            titulo="Ainda não há recomendações."
            descricao="Aparecem aqui quando alguém trouxer um aluno novo."
          />
        }
        renderItem={({ item }) => (
          <Cartao style={ocupado === item.id ? { opacity: 0.5 } : undefined}>
            <Distintivo texto={ROTULO[item.estado]} tom={TOM[item.estado]} />
            <Text style={estilos.nome}>{item.novo_aluno_nome}</Text>
            <Text style={estilos.detalhe}>
              {[
                `trazido por ${item.recomendador_nome}`,
                item.modalidade,
                item.professor_nome,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text style={estilos.data}>
              {formatarDataEscolar(item.criado_em.slice(0, 10))}
            </Text>

            {item.estado === 'registada' ? (
              aAnular === item.id ? (
                <View style={estilos.anular}>
                  <Campo
                    etiqueta="Motivo"
                    value={motivo}
                    onChangeText={setMotivo}
                    ajuda="Fica no registo, para quem vier depois perceber."
                    autoFocus
                  />
                  <BotaoPrincipal
                    texto="Anular"
                    onPress={() => anular(item.id)}
                    ocupado={ocupado === item.id}
                  />
                  <BotaoSecundario
                    texto="Voltar atrás"
                    onPress={() => {
                      setAAnular(null)
                      setMotivo('')
                    }}
                  />
                </View>
              ) : (
                <View style={estilos.accoes}>
                  <BotaoPrincipal texto="Validar" onPress={() => validar(item)} />
                  <BotaoSecundario
                    texto="Anular"
                    tom="destrutivo"
                    onPress={() => {
                      setErro(null)
                      setAAnular(item.id)
                    }}
                  />
                </View>
              )
            ) : null}
          </Cartao>
        )}
      />
    </>
  )
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  nome: { ...texto.cartao, color: cores.tinta },
  detalhe: { ...texto.pequeno, color: cores.tintaSuave },
  data: { ...texto.pequeno, color: cores.tintaSuave },
  accoes: { gap: espaco.xs, marginTop: espaco.s },
  anular: { gap: espaco.s, marginTop: espaco.s },
})
