import { dataMaisRecenteDoDia, formatarDataEscolar, plural, type DiaSemana } from '@ccg/core'
import {
  listarAlunosDoHorario,
  marcarPresencas,
  presencasDaData,
  type AlunoDaAula,
  type MarcacaoPresenca,
} from '@ccg/data'
import { PRESENCAESTADO_VALORES, type PresencaEstado } from '@ccg/types'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ACarregar, Cabecalho, Cartao, EstadoVazio } from '../../../componentes/base'
import { BotaoPrincipal, Mensagem } from '../../../componentes/formulario'
import { useSessao } from '../../../lib/sessao'
import { supabase } from '../../../lib/supabase'
import { cores, espaco, raio, texto } from '../../../lib/tema'

// As três opções, pela ordem em que um professor pensa nelas: primeiro
// quem veio, depois quem avisou, e só no fim quem faltou sem dizer nada.
const OPCOES: { estado: PresencaEstado; rotulo: string; cor: string }[] = [
  { estado: 'presente', rotulo: 'Presente', cor: cores.positivo },
  { estado: 'falta_aviso', rotulo: 'Faltou, avisou', cor: cores.aviso },
  { estado: 'falta_sem_aviso', rotulo: 'Faltou', cor: cores.erro },
]

export default function MarcarPresencas() {
  const { horarioId, dia, data: dataParam } =
    useLocalSearchParams<{ horarioId: string; dia?: string; data?: string }>()
  const router = useRouter()
  const { sessao } = useSessao()

  const [alunos, setAlunos] = useState<AlunoDaAula[]>([])
  const [marcacoes, setMarcacoes] = useState<Map<number, PresencaEstado>>(new Map())
  const [aCarregar, setACarregar] = useState(true)
  const [aGuardar, setAGuardar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  const diaSemana = (dia ?? 'Segunda') as DiaSemana
  // Por omissão, a ocorrência mais recente deste dia da semana — que é
  // quase sempre a aula que o professor acabou de dar.
  const data = dataParam ?? dataMaisRecenteDoDia(diaSemana)

  useEffect(() => {
    if (!horarioId) return
    let ativo = true
    const buscar = async () => {
      const lista = await listarAlunosDoHorario(supabase, Number(horarioId))
      const jaMarcadas = await presencasDaData(
        supabase,
        data,
        lista.map((a) => a.id)
      )
      if (!ativo) return
      setAlunos(lista)
      // Abre com o que já lá está, para corrigir ser tão fácil como marcar.
      setMarcacoes(new Map([...jaMarcadas].map(([id, e]) => [id, e as PresencaEstado])))
      setACarregar(false)
    }
    void buscar()
    return () => {
      ativo = false
    }
  }, [data, horarioId])

  function escolher(matriculaId: number, estado: PresencaEstado) {
    setGuardado(false)
    setMarcacoes((antes) => {
      const novo = new Map(antes)
      // Tocar duas vezes na mesma opção desmarca — sem isso, uma escolha
      // errada não tinha volta a não ser escolher outra qualquer.
      if (novo.get(matriculaId) === estado) novo.delete(matriculaId)
      else novo.set(matriculaId, estado)
      return novo
    })
  }

  async function guardar() {
    if (!sessao) return
    setErro(null)
    setGuardado(false)
    setAGuardar(true)

    const lista: MarcacaoPresenca[] = alunos
      .filter((a) => marcacoes.has(a.id))
      .map((a) => ({
        matriculaId: a.id,
        alunoId: a.aluno_id,
        instrumentoNome: a.instrumentos?.nome ?? null,
        estado: marcacoes.get(a.id)!,
      }))

    const { erro: falha } = await marcarPresencas(supabase, {
      data,
      diaDoHorario: diaSemana,
      professorId: sessao.user.id,
      marcacoes: lista,
    })
    setAGuardar(false)

    if (falha) {
      setErro(falha)
      return
    }

    setGuardado(true)
  }

  if (aCarregar) return <ACarregar />

  const porMarcar = alunos.length - marcacoes.size

  return (
    <>
      <Stack.Screen options={{ title: 'Marcar presenças' }} />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Cabecalho
          sobretitulo={`${diaSemana}, ${formatarDataEscolar(data)}`}
          titulo="Presenças"
          descricao={
            porMarcar > 0
              ? plural(porMarcar, 'aluno por marcar', 'alunos por marcar')
              : 'Todos marcados.'
          }
        />

        {alunos.length === 0 ? (
          <EstadoVazio
            titulo="Sem alunos nesta aula."
            descricao="Não há matrículas confirmadas neste horário."
          />
        ) : (
          alunos.map((a) => {
            const escolhido = marcacoes.get(a.id)
            return (
              <Cartao key={a.id}>
                <Text style={estilos.nome}>{a.alunos?.nome ?? 'Aluno'}</Text>
                {a.instrumentos?.nome ? (
                  <Text style={estilos.disciplina}>{a.instrumentos.nome}</Text>
                ) : null}
                <View style={estilos.opcoes}>
                  {OPCOES.map((o) => {
                    const ativo = escolhido === o.estado
                    return (
                      <Pressable
                        key={o.estado}
                        onPress={() => escolher(a.id, o.estado)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: ativo }}
                        accessibilityLabel={`${o.rotulo}: ${a.alunos?.nome ?? 'aluno'}`}
                        style={[
                          estilos.opcao,
                          ativo && { backgroundColor: o.cor, borderColor: o.cor },
                        ]}
                      >
                        <Text
                          style={[
                            estilos.opcaoTexto,
                            ativo && { color: cores.branco },
                          ]}
                        >
                          {o.rotulo}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </Cartao>
            )
          })
        )}

        {erro ? <Mensagem texto={erro} tom="erro" /> : null}
        {guardado ? <Mensagem texto="Presenças guardadas." tom="sucesso" /> : null}

        {alunos.length > 0 && (
          <BotaoPrincipal
            texto="Guardar presenças"
            onPress={guardar}
            ocupado={aGuardar}
            desativado={marcacoes.size === 0}
          />
        )}

        {guardado && (
          <Pressable onPress={() => router.back()} accessibilityRole="button" style={estilos.voltar}>
            <Text style={estilos.voltarTexto}>Voltar</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  )
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  nome: { ...texto.cartao, color: cores.tinta },
  disciplina: { ...texto.pequeno, color: cores.tintaSuave },
  opcoes: { flexDirection: 'row', gap: espaco.xs, marginTop: espaco.s, flexWrap: 'wrap' },
  opcao: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.pilula,
    paddingVertical: espaco.s + 2,
    paddingHorizontal: espaco.s,
    alignItems: 'center',
    // 44 pontos é o alvo mínimo para um dedo; com este padding fica lá.
    minHeight: 44,
    justifyContent: 'center',
  },
  opcaoTexto: { ...texto.pequeno, fontFamily: 'Geist_600SemiBold', color: cores.tinta },
  voltar: { padding: espaco.m, alignItems: 'center' },
  voltarTexto: { ...texto.corpo, color: cores.azulTexto },
})
