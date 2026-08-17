import { DIAS_SEMANA, formatarHora, palavra } from '@ccg/core'
import { listarAulasDoProfessor, listarHorariosDoProfessor } from '@ccg/data'
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { ACarregar, Cabecalho, Cartao, Distintivo, EstadoVazio } from '../../componentes/base'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { cores, espaco, texto } from '../../lib/tema'

type Faixa = {
  id: number
  dia: string
  inicio: string
  fim: string
  bloqueado: boolean
  ocupado: boolean
}

export default function Horarios() {
  const { sessao } = useSessao()
  const [faixas, setFaixas] = useState<Faixa[]>([])
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    if (!sessao) return
    let ativo = true
    const buscar = async () => {
      const [horarios, aulas] = await Promise.all([
        listarHorariosDoProfessor(supabase, sessao.user.id),
        listarAulasDoProfessor(supabase, sessao.user.id),
      ])
      if (!ativo) return

      // Em dança vários alunos partilham o mesmo horário, por isso a
      // ocupação conta-se por horário distinto e não por matrícula — é o
      // mesmo critério que a web usa no painel.
      const ocupados = new Set(
        aulas.map((a) => a.horario_final_id).filter((id): id is number => id !== null)
      )

      setFaixas(
        horarios.map((h) => ({
          id: h.id,
          dia: h.dia_semana,
          inicio: h.hora_inicio,
          fim: h.hora_fim,
          bloqueado: h.estado === 'bloqueado',
          ocupado: ocupados.has(h.id),
        }))
      )
      setACarregar(false)
    }
    void buscar()
    return () => {
      ativo = false
    }
  }, [sessao])

  if (aCarregar) return <ACarregar />

  const livres = faixas.filter((f) => !f.bloqueado && !f.ocupado).length
  const porDia = DIAS_SEMANA.map((dia) => ({
    dia,
    faixas: faixas
      .filter((f) => f.dia === dia)
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
  })).filter((d) => d.faixas.length > 0)

  return (
    <>
      <Stack.Screen options={{ title: 'Horários' }} />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Cabecalho
          titulo="Horários"
          descricao={
            faixas.length > 0
              ? `${livres} ${palavra(livres, 'faixa livre', 'faixas livres')} de ${faixas.length}`
              : undefined
          }
        />

        {porDia.length === 0 ? (
          <EstadoVazio
            titulo="Ainda não há horários."
            descricao="Criar e bloquear faixas faz-se no site; aqui vês a tua disponibilidade."
          />
        ) : (
          porDia.map(({ dia, faixas: doDia }) => (
            <View key={dia} style={estilos.grupo}>
              <Text style={estilos.dia}>{dia}</Text>
              {doDia.map((f) => (
                <Cartao key={f.id}>
                  <View style={estilos.linha}>
                    <Text style={estilos.hora}>
                      {formatarHora(f.inicio)}–{formatarHora(f.fim)}
                    </Text>
                    <Distintivo
                      texto={f.bloqueado ? 'Bloqueado' : f.ocupado ? 'Com aluno' : 'Livre'}
                      tom={f.bloqueado ? 'neutro' : f.ocupado ? 'azul' : 'positivo'}
                    />
                  </View>
                </Cartao>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </>
  )
}

const estilos = StyleSheet.create({
  conteudo: { padding: espaco.m, paddingBottom: espaco.xxl },
  grupo: { gap: espaco.s, marginBottom: espaco.l },
  dia: { ...texto.etiqueta, color: cores.azulTexto, marginBottom: espaco.xs },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hora: { ...texto.cartao, color: cores.tinta },
})
