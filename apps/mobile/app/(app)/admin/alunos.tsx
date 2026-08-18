import { calcularIdade, plural } from '@ccg/core'
import { listarTodosAlunos, type AlunoAdmin } from '@ccg/data'
import { useEffect, useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, TextInput } from 'react-native'
import { ACarregar, Cabecalho, Cartao, EstadoVazio } from '../../../componentes/base'
import { supabase } from '../../../lib/supabase'
import { cores, espaco, raio, texto } from '../../../lib/tema'

export default function AlunosAdmin() {
  const [alunos, setAlunos] = useState<AlunoAdmin[]>([])
  const [procura, setProcura] = useState('')
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    let ativo = true
    listarTodosAlunos(supabase).then((lista) => {
      if (!ativo) return
      setAlunos(lista)
      setACarregar(false)
    })
    return () => {
      ativo = false
    }
  }, [])

  // Uma escola com centenas de alunos não se percorre com o polegar. A
  // procura é local: a lista já está toda carregada, e ir à base de
  // dados a cada letra seria mais lento do que filtrar aqui.
  const visiveis = useMemo(() => {
    const termo = procura.trim().toLowerCase()
    if (!termo) return alunos
    return alunos.filter((a) => a.nome.toLowerCase().includes(termo))
  }, [alunos, procura])

  if (aCarregar) return <ACarregar />

  return (
    <>
      <FlatList
        data={visiveis}
        keyExtractor={(a) => a.id}
        contentContainerStyle={estilos.lista}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <Cabecalho
              titulo="Alunos"
              descricao={plural(alunos.length, 'aluno na escola', 'alunos na escola')}
            />
            <TextInput
              style={estilos.procura}
              value={procura}
              onChangeText={setProcura}
              placeholder="Procurar por nome"
              placeholderTextColor={cores.tintaSuave}
              autoCapitalize="none"
              accessibilityLabel="Procurar aluno por nome"
              clearButtonMode="while-editing"
            />
          </>
        }
        ListEmptyComponent={
          <EstadoVazio
            titulo={procura ? 'Ninguém com esse nome.' : 'Ainda não há alunos.'}
            descricao={procura ? 'Tenta escrever menos letras.' : undefined}
          />
        }
        renderItem={({ item }) => {
          const idade = calcularIdade(item.data_nascimento)
          return (
            <Cartao>
              <Text style={estilos.nome}>{item.nome}</Text>
              <Text style={estilos.detalhe}>
                {idade !== null ? `${idade} anos` : 'Idade por preencher'}
              </Text>
            </Cartao>
          )
        }}
      />
    </>
  )
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  procura: {
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.pilula,
    backgroundColor: cores.branco,
    paddingHorizontal: espaco.m,
    height: 48,
    marginBottom: espaco.s,
    ...texto.corpo,
    color: cores.tinta,
  },
  nome: { ...texto.cartao, color: cores.tinta },
  detalhe: { ...texto.pequeno, color: cores.tintaSuave },
})
