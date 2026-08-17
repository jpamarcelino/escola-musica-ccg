import { formatarHora, formatarSala, plural } from '@ccg/core'
import { listarAulasDoProfessor, type AulaDoProfessor } from '@ccg/data'
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { FlatList, StyleSheet, Text } from 'react-native'
import { ACarregar, Cabecalho, Cartao, EstadoVazio } from '../../componentes/base'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco, texto } from '../../lib/tema'

// Os alunos de um professor, um por linha. Um aluno com duas disciplinas
// aparece uma vez só, com as duas — na web a lista era por matrícula e o
// mesmo nome repetia-se, o que dava a impressão de haver mais alunos do
// que há.
type Aluno = {
  nome: string
  aulas: AulaDoProfessor[]
}

export default function AlunosDoProfessor() {
  const { sessao } = useSessao()
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    if (!sessao) return
    let ativo = true
    const buscar = async () => {
      const aulas = await listarAulasDoProfessor(supabase, sessao.user.id)
      if (!ativo) return
      const por = new Map<string, AulaDoProfessor[]>()
      for (const a of aulas) {
        const nome = a.alunos?.nome ?? 'Aluno'
        por.set(nome, [...(por.get(nome) ?? []), a])
      }
      setAlunos(
        [...por.entries()]
          .map(([nome, lista]) => ({ nome, aulas: lista }))
          .sort((a, b) => a.nome.localeCompare(b.nome))
      )
      setACarregar(false)
    }
    void buscar()
    return () => {
      ativo = false
    }
  }, [sessao])

  if (aCarregar) return <ACarregar />

  return (
    <>
      <Stack.Screen options={{ title: 'Os teus alunos' }} />
      <FlatList
        data={alunos}
        keyExtractor={(a) => a.nome}
        contentContainerStyle={estilos.lista}
        ListHeaderComponent={
          <Cabecalho
            titulo="Os teus alunos"
            descricao={
              alunos.length > 0 ? plural(alunos.length, 'aluno', 'alunos') : undefined
            }
          />
        }
        ListEmptyComponent={
          <EstadoVazio
            titulo="Ainda não tens alunos."
            descricao="Aparecem aqui depois de confirmares o horário de um pedido."
          />
        }
        renderItem={({ item }) => (
          <Cartao>
            <Text style={estilos.nome}>{item.nome}</Text>
            {item.aulas.map((a) => (
              <Text key={a.id} style={estilos.aula}>
                {[
                  a.instrumentos?.nome,
                  a.horarios
                    ? `${a.horarios.dia_semana} ${formatarHora(a.horarios.hora_inicio)}`
                    : null,
                  a.horarios ? formatarSala(a.horarios.salas) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ))}
          </Cartao>
        )}
      />
    </>
  )
}

const estilos = StyleSheet.create({
  lista: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  nome: { ...texto.cartao, color: cores.tinta },
  aula: { ...texto.pequeno, color: cores.tintaSuave },
})
