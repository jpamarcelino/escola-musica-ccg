import {
  DIAS_SEMANA,
  calcularIdade,
  elegivelParaDisciplina,
  formatarHora,
  plural,
  separarFaixaEtaria,
} from '@ccg/core'
import {
  listarHorariosPublicos,
  listarInstrumentos,
  listarProfessoresDoInstrumento,
  pedirAula,
  type HorarioPublico,
  type Instrumento,
  type ProfessorPublico,
} from '@ccg/data'
import type { InstrumentoPrograma } from '@ccg/types'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { ACarregar, Cabecalho, Cartao, Distintivo, EstadoVazio } from '../componentes/base'
import { BotaoPrincipal, Mensagem } from '../componentes/formulario'
import { supabase } from '../lib/supabase'
import { espaco, raio, texto, type Cores } from '../lib/tema'
import { useEstilos, useTema } from '../lib/tema-contexto'

// O mesmo percurso do /pedir-aula da web, em quatro passos: escola,
// disciplina, professor, horários. A idade não é um passo — vem do aluno
// que já está escolhido, e serve para filtrar as disciplinas.
type Passo = 'escola' | 'disciplina' | 'professor' | 'horarios'

const ESCOLAS: { programa: InstrumentoPrograma; nome: string; descricao: string }[] = [
  { programa: 'musica', nome: 'Música', descricao: 'Instrumentos, canto e teoria' },
  { programa: 'danca', nome: 'Dança', descricao: 'Ballet, moderna e estilos urbanos' },
  { programa: 'bebes', nome: 'Música para Bebés', descricao: 'Dos 0 aos 5 anos' },
]

export default function PedirAula() {
  const estilos = useEstilos(criarEstilos)
  const { alunoId, nome, dataNascimento } =
    useLocalSearchParams<{ alunoId: string; nome?: string; dataNascimento?: string }>()
  const router = useRouter()

  const [passo, setPasso] = useState<Passo>('escola')
  const [programa, setPrograma] = useState<InstrumentoPrograma | null>(null)
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([])
  const [instrumento, setInstrumento] = useState<Instrumento | null>(null)
  const [professores, setProfessores] = useState<ProfessorPublico[]>([])
  const [professor, setProfessor] = useState<ProfessorPublico | null>(null)
  const [horarios, setHorarios] = useState<HorarioPublico[]>([])
  const [escolhidos, setEscolhidos] = useState<Set<number>>(new Set())
  const [mensagem, setMensagem] = useState('')
  const [aCarregar, setACarregar] = useState(false)
  const [aEnviar, setAEnviar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const idade = calcularIdade(dataNascimento)

  useEffect(() => {
    if (!programa) return
    let ativo = true
    setACarregar(true)
    listarInstrumentos(supabase, programa).then((lista) => {
      if (!ativo) return
      setInstrumentos(lista)
      setACarregar(false)
    })
    return () => {
      ativo = false
    }
  }, [programa])

  useEffect(() => {
    if (!instrumento) return
    let ativo = true
    setACarregar(true)
    listarProfessoresDoInstrumento(supabase, instrumento.id).then((lista) => {
      if (!ativo) return
      setProfessores(lista)
      setACarregar(false)
    })
    return () => {
      ativo = false
    }
  }, [instrumento])

  useEffect(() => {
    if (!professor) return
    let ativo = true
    setACarregar(true)
    listarHorariosPublicos(supabase, professor.professor_id).then((lista) => {
      if (!ativo) return
      // Faixas bloqueadas não se escolhem — não são disponibilidade.
      setHorarios(lista.filter((h) => h.estado !== 'bloqueado'))
      setACarregar(false)
    })
    return () => {
      ativo = false
    }
  }, [professor])

  async function enviar() {
    if (!alunoId || !instrumento || !professor) return
    setErro(null)
    setAEnviar(true)
    const { erro: falha } = await pedirAula(supabase, {
      alunoId,
      professorId: professor.professor_id,
      instrumentoId: instrumento.id,
      mensagem,
      horarioIds: [...escolhidos],
    })
    setAEnviar(false)
    if (falha) {
      setErro(falha)
      return
    }
    router.back()
  }

  function voltar() {
    if (passo === 'horarios') {
      setProfessor(null)
      setEscolhidos(new Set())
      setPasso('professor')
    } else if (passo === 'professor') {
      setInstrumento(null)
      setPasso('disciplina')
    } else if (passo === 'disciplina') {
      setPrograma(null)
      setPasso('escola')
    } else {
      router.back()
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Pedir aula',
          // O "voltar" do cabeçalho recua um passo do assistente em vez de
          // sair de tudo — sair a meio de quatro passos perde o caminho.
          headerLeft: () => (
            <Pressable onPress={voltar} accessibilityRole="button" accessibilityLabel="Voltar">
              <Text style={estilos.voltar}>‹ Voltar</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Cabecalho
          sobretitulo={nome ? `Para ${nome}` : undefined}
          titulo={TITULOS[passo]}
          descricao={idade !== null ? `${idade} anos` : undefined}
        />

        <Migalhas passo={passo} programa={programa} instrumento={instrumento} professor={professor} />

        {aCarregar ? (
          <ACarregar />
        ) : passo === 'escola' ? (
          ESCOLAS.map((e) => (
            <Pressable
              key={e.programa}
              onPress={() => {
                setPrograma(e.programa)
                setPasso('disciplina')
              }}
              accessibilityRole="button"
            >
              <Cartao>
                <Text style={estilos.opcaoNome}>{e.nome}</Text>
                <Text style={estilos.opcaoNota}>{e.descricao}</Text>
              </Cartao>
            </Pressable>
          ))
        ) : passo === 'disciplina' ? (
          <Disciplinas
            instrumentos={instrumentos}
            programa={programa!}
            idade={idade}
            escolher={(i) => {
              setInstrumento(i)
              setPasso('professor')
            }}
          />
        ) : passo === 'professor' ? (
          professores.length === 0 ? (
            <EstadoVazio
              titulo="Ainda não há professores nesta disciplina."
              descricao="Escolhe outra, ou tenta mais tarde."
            />
          ) : (
            professores.map((p) => (
              <Pressable
                key={p.professor_id}
                onPress={() => {
                  setProfessor(p)
                  setPasso('horarios')
                }}
                accessibilityRole="button"
              >
                <Cartao>
                  <Text style={estilos.opcaoNome}>{p.nome}</Text>
                  {p.especialidade ? (
                    <Text style={estilos.opcaoNota}>{p.especialidade}</Text>
                  ) : null}
                </Cartao>
              </Pressable>
            ))
          )
        ) : (
          <Horarios
            horarios={horarios}
            escolhidos={escolhidos}
            alternar={(id) =>
              setEscolhidos((antes) => {
                const novo = new Set(antes)
                if (novo.has(id)) novo.delete(id)
                else novo.add(id)
                return novo
              })
            }
            mensagem={mensagem}
            setMensagem={setMensagem}
            erro={erro}
            enviar={enviar}
            aEnviar={aEnviar}
          />
        )}
      </ScrollView>
    </>
  )
}

const TITULOS: Record<Passo, string> = {
  escola: 'Que escola?',
  disciplina: 'Que disciplina?',
  professor: 'Com que professor?',
  horarios: 'Quando podes?',
}

function Migalhas({
  passo,
  programa,
  instrumento,
  professor,
}: {
  passo: Passo
  programa: InstrumentoPrograma | null
  instrumento: Instrumento | null
  professor: ProfessorPublico | null
}) {
  const estilos = useEstilos(criarEstilos)
  const feitas = [
    programa ? ESCOLAS.find((e) => e.programa === programa)?.nome : null,
    instrumento ? separarFaixaEtaria(instrumento.nome).titulo : null,
    professor?.nome,
  ].filter(Boolean) as string[]

  if (feitas.length === 0) return null

  // As escolhas já feitas, sempre à vista: num assistente de quatro
  // passos, esquecer o que se escolheu é o mais fácil que há.
  return (
    <View style={estilos.migalhas}>
      {feitas.map((f) => (
        <Distintivo key={f} texto={f} tom="azul" />
      ))}
      {passo === 'horarios' ? null : null}
    </View>
  )
}

function Disciplinas({
  instrumentos,
  programa,
  idade,
  escolher,
}: {
  instrumentos: Instrumento[]
  programa: InstrumentoPrograma
  idade: number | null
  escolher: (i: Instrumento) => void
}) {
  const estilos = useEstilos(criarEstilos)
  if (instrumentos.length === 0) {
    return <EstadoVazio titulo="Ainda não há disciplinas nesta escola." />
  }

  // Os inelegíveis aparecem bloqueados e no fim, como na web — esconder
  // uma disciplina não explica porque é que ela não está lá.
  const comElegibilidade = instrumentos.map((i) => ({
    instrumento: i,
    elegivel: elegivelParaDisciplina(idade, programa, i.nome),
  }))
  const ordenados = [
    ...comElegibilidade.filter((x) => x.elegivel),
    ...comElegibilidade.filter((x) => !x.elegivel),
  ]

  return (
    <>
      {ordenados.map(({ instrumento: i, elegivel }) => {
        const { titulo, idade: faixa } = separarFaixaEtaria(i.nome)
        return (
          <Pressable
            key={i.id}
            onPress={() => elegivel && escolher(i)}
            disabled={!elegivel}
            accessibilityRole="button"
            accessibilityState={{ disabled: !elegivel }}
          >
            <Cartao style={!elegivel ? estilos.bloqueado : undefined}>
              <Text style={estilos.opcaoNome}>{titulo}</Text>
              {faixa ? <Text style={estilos.opcaoNota}>{faixa}</Text> : null}
              {!elegivel ? (
                <Distintivo texto="Fora da faixa etária" tom="neutro" />
              ) : null}
            </Cartao>
          </Pressable>
        )
      })}
    </>
  )
}

function Horarios({
  horarios,
  escolhidos,
  alternar,
  mensagem,
  setMensagem,
  erro,
  enviar,
  aEnviar,
}: {
  horarios: HorarioPublico[]
  escolhidos: Set<number>
  alternar: (id: number) => void
  mensagem: string
  setMensagem: (v: string) => void
  erro: string | null
  enviar: () => void
  aEnviar: boolean
}) {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const porDia = DIAS_SEMANA.map((dia) => ({
    dia,
    faixas: horarios.filter((h) => h.dia_semana === dia),
  })).filter((d) => d.faixas.length > 0)

  return (
    <>
      <Text style={estilos.ajuda}>
        Marca todas as horas a que podes. O professor escolhe uma delas.
      </Text>

      {porDia.map(({ dia, faixas }) => (
        <View key={dia} style={estilos.grupo}>
          <Text style={estilos.dia}>{dia}</Text>
          {faixas.map((h) => {
            const ativo = escolhidos.has(h.id)
            return (
              <Pressable
                key={h.id}
                onPress={() => alternar(h.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ativo }}
                accessibilityLabel={`${dia} às ${formatarHora(h.hora_inicio)}`}
                style={[estilos.faixa, ativo && estilos.faixaEscolhida]}
              >
                <Text style={[estilos.faixaHora, ativo && { color: cores.sobreAcento }]}>
                  {formatarHora(h.hora_inicio)}–{formatarHora(h.hora_fim)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ))}

      <Text style={estilos.dia}>Mensagem (opcional)</Text>
      <TextInput
        style={estilos.mensagem}
        value={mensagem}
        onChangeText={setMensagem}
        multiline
        maxLength={500}
        placeholder="Se nenhuma hora servir, diz aqui quando podes."
        placeholderTextColor={cores.tintaSuave}
        accessibilityLabel="Mensagem para o professor"
      />

      {erro ? <Mensagem texto={erro} tom="erro" /> : null}

      <BotaoPrincipal
        texto={
          escolhidos.size > 0
            ? `Enviar pedido · ${plural(escolhidos.size, 'hora', 'horas')}`
            : 'Enviar pedido'
        }
        onPress={enviar}
        ocupado={aEnviar}
        desativado={escolhidos.size === 0 && !mensagem.trim()}
      />
    </>
  )
}

const criarEstilos = (cores: Cores) => StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  voltar: { ...texto.corpo, color: cores.azulFundo },
  migalhas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.xs, marginBottom: espaco.s },
  opcaoNome: { ...texto.cartao, color: cores.tinta },
  opcaoNota: { ...texto.pequeno, color: cores.tintaSuave },
  bloqueado: { opacity: 0.55 },
  ajuda: { ...texto.pequeno, color: cores.tintaSuave, marginBottom: espaco.s },
  grupo: { gap: espaco.xs, marginBottom: espaco.m },
  dia: { ...texto.etiqueta, color: cores.azulTexto, marginTop: espaco.s },
  faixa: {
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.cartao,
    backgroundColor: cores.cartao,
    paddingHorizontal: espaco.m,
    minHeight: 48,
    justifyContent: 'center',
  },
  faixaEscolhida: { backgroundColor: cores.azulFundo, borderColor: cores.azulFundo },
  faixaHora: { ...texto.cartao, color: cores.tinta },
  mensagem: {
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.cartao,
    backgroundColor: cores.cartao,
    padding: espaco.m,
    minHeight: 96,
    textAlignVertical: 'top',
    ...texto.corpo,
    color: cores.tinta,
  },
})
