import { plural } from '@ccg/core'
import { listarProfessores, type ProfessorAdmin } from '@ccg/data'
import { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text } from 'react-native'
import { ACarregar, Cabecalho, Cartao, Distintivo, EstadoVazio } from '../../../componentes/base'
import { supabase } from '../../../lib/supabase'
import { cores, espaco, texto } from '../../../lib/tema'

const ESCOLA: Record<string, string> = {
  musica: 'Música',
  danca: 'Dança',
}

export default function ProfessoresAdmin() {
  const [professores, setProfessores] = useState<ProfessorAdmin[]>([])
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    let ativo = true
    listarProfessores(supabase).then((lista) => {
      if (!ativo) return
      setProfessores(lista)
      setACarregar(false)
    })
    return () => {
      ativo = false
    }
  }, [])

  if (aCarregar) return <ACarregar />

  return (
    <>
      <FlatList
        data={professores}
        keyExtractor={(p) => p.id}
        contentContainerStyle={estilos.lista}
        ListHeaderComponent={
          <Cabecalho
            titulo="Professores"
            descricao={plural(professores.length, 'professor', 'professores')}
          />
        }
        ListEmptyComponent={<EstadoVazio titulo="Ainda não há professores." />}
        renderItem={({ item }) => (
          <Cartao>
            <Text style={estilos.nome}>{item.nome}</Text>
            <Text style={estilos.detalhe}>
              {item.programa ? ESCOLA[item.programa] ?? item.programa : 'Escola por definir'}
            </Text>
            {item.admin ? <Distintivo texto="Administração" tom="azul" /> : null}
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
})
