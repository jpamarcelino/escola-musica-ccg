import {
  agoraNaEscola,
  diaSemanaDaData,
  formatarHora,
  hojeISO,
  plural,
} from '@ccg/core'
import {
  listarAulasDoProfessor,
  matriculasComPresencaMarcada,
  type AulaDoProfessor,
} from '@ccg/data'
import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native'
import {
  ACarregar,
  Cabecalho,
  Cartao,
  CartaoTocavel,
  Distintivo,
  EstadoVazio,
} from '../../componentes/base'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco, texto } from '../../lib/tema'

// O que falta marcar hoje. Cada aula por marcar leva ao ecrã da chamada.
//
// Só aparecem aqui as aulas que JÁ ACABARAM: marcar presenças numa aula
// a decorrer é registar quem esteve antes de a aula ter acontecido.
export default function Presencas() {
  const { sessao } = useSessao()
  const [porMarcar, setPorMarcar] = useState<AulaDoProfessor[]>([])
  const [marcadas, setMarcadas] = useState<AulaDoProfessor[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [aRecarregar, setARecarregar] = useState(false)

  const carregar = useCallback(async () => {
    if (!sessao) return
    const agora = agoraNaEscola()
    const hoje = hojeISO()
    const diaHoje = diaSemanaDaData(hoje)
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(
      agora.getMinutes()
    ).padStart(2, '0')}`

    const aulas = await listarAulasDoProfessor(supabase, sessao.user.id)
    const acabadasHoje = aulas.filter(
      (a) => a.horarios?.dia_semana === diaHoje && a.horarios.hora_fim.slice(0, 5) <= horaAtual
    )
    const jaMarcadas = await matriculasComPresencaMarcada(
      supabase,
      hoje,
      acabadasHoje.map((a) => a.id)
    )

    setPorMarcar(acabadasHoje.filter((a) => !jaMarcadas.has(a.id)))
    setMarcadas(acabadasHoje.filter((a) => jaMarcadas.has(a.id)))
  }, [sessao])

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

  if (aCarregar) return <ACarregar />

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
        titulo="Presenças"
        descricao={
          porMarcar.length > 0
            ? plural(porMarcar.length, 'aula por marcar hoje', 'aulas por marcar hoje')
            : 'Nada por marcar hoje.'
        }
      />

      {porMarcar.length === 0 && marcadas.length === 0 ? (
        <EstadoVazio
          titulo="Ainda não acabou nenhuma aula hoje."
          descricao="As aulas aparecem aqui à medida que forem terminando."
        />
      ) : (
        <>
          {porMarcar.map((a) => (
            <Link
              key={a.id}
              href={{
                pathname: '/professor/presencas/[horarioId]',
                params: {
                  horarioId: String(a.horario_final_id),
                  dia: a.horarios?.dia_semana ?? '',
                },
              }}
              asChild
            >
              <CartaoTocavel rotulo={`Marcar presenças de ${a.alunos?.nome ?? 'aluno'}`}>
                <Distintivo texto="Por marcar" tom="aviso" />
                <Text style={estilos.nome}>{a.alunos?.nome ?? 'Aluno'}</Text>
                <Text style={estilos.detalhe}>
                  {[a.instrumentos?.nome, a.horarios ? horas(a) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </CartaoTocavel>
            </Link>
          ))}

          {marcadas.map((a) => (
            <Cartao key={a.id}>
              <Distintivo texto="Marcada" tom="positivo" />
              <Text style={estilos.nome}>{a.alunos?.nome ?? 'Aluno'}</Text>
              <Text style={estilos.detalhe}>
                {[a.instrumentos?.nome, a.horarios ? horas(a) : null].filter(Boolean).join(' · ')}
              </Text>
            </Cartao>
          ))}

          {porMarcar.length > 0 && (
            <Text style={estilos.nota}>Toca numa aula para marcar quem esteve.</Text>
          )}
        </>
      )}
    </ScrollView>
  )
}

function horas(a: AulaDoProfessor): string {
  return `${formatarHora(a.horarios!.hora_inicio)}–${formatarHora(a.horarios!.hora_fim)}`
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  nome: { ...texto.cartao, color: cores.tinta },
  detalhe: { ...texto.pequeno, color: cores.tintaSuave },
  nota: {
    ...texto.pequeno,
    color: cores.tintaSuave,
    marginTop: espaco.m,
    textAlign: 'center',
  },
})
