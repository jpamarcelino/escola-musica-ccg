import { listarInstrumentos, type Instrumento } from '@ccg/data'
import type { InstrumentoPrograma } from '@ccg/types'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Cartao } from '../componentes/base'
import { BotaoPrincipal, BotaoSecundario } from '../componentes/formulario'
import { supabase } from '../lib/supabase'
import { cores, espaco, raio, texto } from '../lib/tema'

// A porta de entrada para quem ainda não tem conta: o que a escola tem.
//
// As palavras são as da home da web (public-home-experience.tsx), porque
// é o mesmo convite a dizer a mesma coisa. As imagens não vêm — são
// ficheiros da pasta public/ da web e trazê-las para a app engordaria o
// bundle para pouco; aqui o que carrega a página é a tipografia.
const ESCOLAS: {
  id: InstrumentoPrograma
  nome: string
  detalhe: string
  texto: string
}[] = [
  {
    id: 'musica',
    nome: 'Música',
    detalhe: 'Piano · guitarra · canto · bateria',
    texto: 'Aprender a escutar, repetir e encontrar uma voz própria.',
  },
  {
    id: 'danca',
    nome: 'Dança',
    detalhe: 'Ballet · contemporâneo · estilos urbanos',
    texto: 'Descobrir o corpo, o espaço e a expressão através do movimento.',
  },
  {
    id: 'bebes',
    nome: 'Primeiros sons',
    detalhe: 'Música para bebés · 0–5 anos',
    texto: 'Uma primeira relação com som, ritmo e criação em família.',
  },
]

export default function Descobrir() {
  const router = useRouter()
  const [aberta, setAberta] = useState<InstrumentoPrograma | null>(null)
  const [disciplinas, setDisciplinas] = useState<Instrumento[]>([])

  useEffect(() => {
    if (!aberta) return
    let ativo = true
    // Sem sessão. A política de RLS da tabela `instrumentos` deixa
    // qualquer pessoa ver a oferta — é isso que permite haver uma página
    // de descoberta antes de alguém se registar.
    listarInstrumentos(supabase, aberta).then((lista) => {
      if (ativo) setDisciplinas(lista)
    })
    return () => {
      ativo = false
    }
  }, [aberta])

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Text style={estilos.sobretitulo}>Centro Cultural da Guarda</Text>
        <Text style={estilos.titulo}>Onde começa uma prática.</Text>
        <Text style={estilos.entrada}>
          Três escolas, dos primeiros sons aos instrumentos. Vê o que há e pede
          uma aula — a conta cria-se em dois minutos.
        </Text>

        {ESCOLAS.map((e) => {
          const ativa = aberta === e.id
          return (
            <Cartao key={e.id}>
              <Pressable
                onPress={() => {
                  setDisciplinas([])
                  setAberta(ativa ? null : e.id)
                }}
                accessibilityRole="button"
                accessibilityState={{ expanded: ativa }}
                accessibilityLabel={`${e.nome}. ${e.detalhe}`}
              >
                <Text style={estilos.escolaNome}>{e.nome}</Text>
                <Text style={estilos.escolaDetalhe}>{e.detalhe}</Text>
                <Text style={estilos.escolaTexto}>{e.texto}</Text>
                <Text style={estilos.verMais}>
                  {ativa ? 'Esconder disciplinas' : 'Ver disciplinas'}
                </Text>
              </Pressable>

              {ativa && disciplinas.length > 0 ? (
                <View style={estilos.disciplinas}>
                  {disciplinas.map((d) => (
                    <View key={d.id} style={estilos.disciplina}>
                      <Text style={estilos.disciplinaNome}>{d.nome}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Cartao>
          )
        })}

        <View style={estilos.rodape}>
          <BotaoPrincipal texto="Criar conta" onPress={() => router.push('/registo')} />
          <BotaoSecundario texto="Já tenho conta" onPress={() => router.push('/entrar')} />
          <Text style={estilos.assinatura}>Pela Guarda, pela arte e pela cultura.</Text>
        </View>
      </ScrollView>
    </>
  )
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: espaco.l,
    gap: espaco.s,
    paddingBottom: espaco.xxl,
    backgroundColor: cores.papel,
  },
  sobretitulo: { ...texto.etiqueta, color: cores.azulTexto },
  titulo: { ...texto.titulo, fontSize: 34, lineHeight: 40, color: cores.tinta },
  entrada: {
    ...texto.corpo,
    color: cores.tintaSuave,
    marginBottom: espaco.m,
  },
  escolaNome: { ...texto.seccao, color: cores.tinta },
  escolaDetalhe: { ...texto.pequeno, color: cores.azulTexto },
  escolaTexto: { ...texto.corpo, color: cores.tintaSuave, marginTop: espaco.xs },
  verMais: { ...texto.pequeno, fontFamily: 'Geist_600SemiBold', color: cores.azulTexto, marginTop: espaco.s },
  disciplinas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.xs, marginTop: espaco.s },
  disciplina: {
    backgroundColor: cores.papel2,
    borderRadius: raio.pilula,
    paddingVertical: 6,
    paddingHorizontal: espaco.s + 2,
  },
  disciplinaNome: { ...texto.pequeno, color: cores.tinta },
  rodape: { marginTop: espaco.l, gap: espaco.s },
  assinatura: {
    ...texto.pequeno,
    color: cores.tintaSuave,
    textAlign: 'center',
    marginTop: espaco.m,
  },
})
