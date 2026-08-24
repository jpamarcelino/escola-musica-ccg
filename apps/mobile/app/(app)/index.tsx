import {
  agoraNaEscola,
  diaSemanaDaData,
  estadoTemporalAula,
  formatarDataEscolar,
  formatarHora,
  formatarSala,
  hojeISO,
  plural,
  proximaOcorrenciaDeAula,
} from '@ccg/core'
import {
  contarNotificacoesPorLer,
  ehProfessor,
  listarAlunosDoEncarregado,
  listarAulasDoProfessor,
  listarMatriculasDoAluno,
  listarPedidosPendentes,
  matriculasComPresencaMarcada,
  type AulaDoProfessor,
} from '@ccg/data'
import { Link } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  ACarregar,
  Cabecalho,
  Cartao,
  CartaoTocavel,
  Distintivo,
  EstadoVazio,
} from '../../componentes/base'
import { usePerfil } from '../../lib/perfil'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { espaco, texto, type Cores } from '../../lib/tema'
import { useEstilos, useTema } from '../../lib/tema-contexto'

// Uma aula pronta a mostrar, venha ela do lado do professor ou do lado
// da família. Os dois ecrãs querem responder à mesma pergunta — o que é
// que se passa hoje — por isso convergem na mesma forma.
type Linha = {
  chave: string
  titulo: string
  detalhe: string | null
  data: string
  horaInicio: string
  horaFim: string
  sala: string | null
}

export default function Hoje() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const { sessao } = useSessao()
  const { perfil } = usePerfil()
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [porConfirmar, setPorConfirmar] = useState(0)
  const [pendentes, setPendentes] = useState(0)
  const [avisos, setAvisos] = useState(0)
  const [aCarregar, setACarregar] = useState(true)
  const [aRecarregar, setARecarregar] = useState(false)

  const professor = ehProfessor(perfil?.tipo)

  const carregar = useCallback(async () => {
    if (!sessao) return
    const agora = agoraNaEscola()
    const uid = sessao.user.id

    if (professor) {
      const [aulas, listaPedidos] = await Promise.all([
        listarAulasDoProfessor(supabase, uid),
        listarPedidosPendentes(supabase, uid),
      ])
      setPendentes(listaPedidos.length)
      setLinhas(paraLinhas(aulas, agora))

      // Aulas que já acabaram hoje e ainda não têm presença marcada —
      // é o número que a web mostra ao professor logo à entrada.
      const diaHoje = diaSemanaDaData(hojeISO())
      const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(
        agora.getMinutes()
      ).padStart(2, '0')}`
      const acabadas = aulas.filter(
        (a) => a.horarios?.dia_semana === diaHoje && a.horarios.hora_fim.slice(0, 5) <= horaAtual
      )
      const marcadas = await matriculasComPresencaMarcada(
        supabase,
        hojeISO(),
        acabadas.map((a) => a.id)
      )
      setPorConfirmar(acabadas.filter((a) => !marcadas.has(a.id)).length)
      return
    }

    const [alunos, naoLidas] = await Promise.all([
      listarAlunosDoEncarregado(supabase, uid),
      contarNotificacoesPorLer(supabase, uid),
    ])
    setAvisos(naoLidas)

    const porAluno = await Promise.all(
      alunos.map(async (a) => ({
        aluno: a,
        matriculas: await listarMatriculasDoAluno(supabase, a.id),
      }))
    )

    setPendentes(
      porAluno.reduce(
        (t, p) => t + p.matriculas.filter((m) => m.estado === 'a_escolher').length,
        0
      )
    )

    const todas: Linha[] = []
    for (const { aluno, matriculas } of porAluno) {
      for (const m of matriculas) {
        if (m.estado !== 'confirmado' || !m.horarios) continue
        todas.push({
          chave: `${aluno.id}-${m.id}`,
          titulo: m.instrumentos?.nome ?? 'Aula',
          // Do lado da família o que falta saber é de quem é a aula.
          detalhe: aluno.nome,
          data: proximaOcorrenciaDeAula(
            m.horarios.dia_semana,
            m.horarios.hora_inicio,
            m.horarios.hora_fim,
            agora
          ),
          horaInicio: m.horarios.hora_inicio,
          horaFim: m.horarios.hora_fim,
          sala: formatarSala(m.horarios.salas),
        })
      }
    }
    setLinhas(ordenar(todas))
  }, [professor, sessao])

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

  const agora = agoraNaEscola()
  const hoje = hojeISO()
  const deHoje = linhas.filter((l) => l.data === hoje)
  const aSeguir = linhas.filter((l) => l.data > hoje).slice(0, 4)

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
        sobretitulo={formatarDataEscolar(hoje, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
        titulo={primeiroNome(perfil?.nome)}
      />

      {(porConfirmar > 0 || pendentes > 0 || avisos > 0) && (
        <View style={estilos.avisos}>
          {porConfirmar > 0 && (
            <Distintivo
              texto={plural(porConfirmar, 'presença por marcar', 'presenças por marcar')}
              tom="aviso"
            />
          )}
          {pendentes > 0 && (
            <Distintivo
              texto={
                professor
                  ? plural(pendentes, 'pedido por responder', 'pedidos por responder')
                  : plural(pendentes, 'pedido à espera', 'pedidos à espera')
              }
              tom="azul"
            />
          )}
          {avisos > 0 && (
            <Distintivo texto={plural(avisos, 'aviso por ler', 'avisos por ler')} tom="azul" />
          )}
        </View>
      )}

      <Text style={estilos.seccao}>Hoje</Text>
      {deHoje.length === 0 ? (
        <EstadoVazio
          titulo="Hoje não há aulas."
          descricao={
            professor
              ? 'Nenhuma aula marcada para hoje na tua agenda.'
              : 'Nenhuma aula marcada para hoje.'
          }
        />
      ) : (
        deHoje.map((l) => (
          <CartaoAula
            key={l.chave}
            linha={l}
            estado={estadoTemporalAula(l.data, l.horaInicio, l.horaFim, agora)}
          />
        ))
      )}

      {aSeguir.length > 0 && (
        <>
          <Text style={estilos.seccao}>A seguir</Text>
          {aSeguir.map((l) => (
            <CartaoAula key={l.chave} linha={l} estado="futura" comData />
          ))}
        </>
      )}

      {/* Os ecrãs que não têm separador próprio. A web chega-lhes pelo
          painel do professor; aqui é pelo mesmo sítio, para quem conhece
          um lado procurar no outro onde espera. */}
      {professor && (
        <>
          <Text style={estilos.seccao}>Gerir</Text>
          <Link href="/professor/alunos" asChild>
            <CartaoTocavel rotulo="Ver os teus alunos">
              <Text style={estilos.aulaTitulo}>Alunos</Text>
              <Text style={estilos.aulaDetalhe}>Quem tens, com que disciplina e quando</Text>
            </CartaoTocavel>
          </Link>
          <Link href="/professor/horarios" asChild>
            <CartaoTocavel rotulo="Ver os teus horários">
              <Text style={estilos.aulaTitulo}>Horários</Text>
              <Text style={estilos.aulaDetalhe}>A tua disponibilidade da semana</Text>
            </CartaoTocavel>
          </Link>
          <Link href="/professor/mensalidades" asChild>
            <CartaoTocavel rotulo="Ver mensalidades">
              <Text style={estilos.aulaTitulo}>Mensalidades</Text>
              <Text style={estilos.aulaDetalhe}>O que está pago e o que falta receber</Text>
            </CartaoTocavel>
          </Link>
        </>
      )}
    </ScrollView>
  )
}

function CartaoAula({
  linha,
  estado,
  comData,
}: {
  linha: Linha
  estado: 'agora' | 'proxima' | 'futura'
  comData?: boolean
}) {
  const estilos = useEstilos(criarEstilos)
  return (
    <Cartao>
      {estado === 'agora' && <Distintivo texto="A decorrer" tom="positivo" />}
      <Text style={estilos.aulaTitulo}>{linha.titulo}</Text>
      <Text style={estilos.aulaQuando}>
        {comData ? `${formatarDataEscolar(linha.data)} · ` : ''}
        {formatarHora(linha.horaInicio)}–{formatarHora(linha.horaFim)}
      </Text>
      {(linha.detalhe || linha.sala) && (
        <Text style={estilos.aulaDetalhe}>
          {[linha.detalhe, linha.sala].filter(Boolean).join(' · ')}
        </Text>
      )}
    </Cartao>
  )
}

function paraLinhas(aulas: AulaDoProfessor[], agora: Date): Linha[] {
  return ordenar(
    aulas
      .filter((a) => a.horarios)
      .map((a) => ({
        chave: String(a.id),
        titulo: a.alunos?.nome ?? 'Aluno',
        // Do lado do professor o aluno é o título e a disciplina o detalhe
        // — é o nome que ele procura na lista, não o instrumento.
        detalhe: a.instrumentos?.nome ?? null,
        data: proximaOcorrenciaDeAula(
          a.horarios!.dia_semana,
          a.horarios!.hora_inicio,
          a.horarios!.hora_fim,
          agora
        ),
        horaInicio: a.horarios!.hora_inicio,
        horaFim: a.horarios!.hora_fim,
        sala: formatarSala(a.horarios!.salas),
      }))
  )
}

function ordenar(linhas: Linha[]): Linha[] {
  return [...linhas].sort(
    (a, b) => a.data.localeCompare(b.data) || a.horaInicio.localeCompare(b.horaInicio)
  )
}

function primeiroNome(nome: string | undefined): string {
  if (!nome) return 'Olá'
  return nome.trim().split(/\s+/)[0]
}

const criarEstilos = (cores: Cores) => StyleSheet.create({
  conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },
  avisos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.xs, marginBottom: espaco.s },
  seccao: { ...texto.seccao, color: cores.tinta, marginTop: espaco.m, marginBottom: espaco.xs },
  aulaTitulo: { ...texto.cartao, color: cores.tinta },
  aulaQuando: { ...texto.corpo, color: cores.tinta },
  aulaDetalhe: { ...texto.pequeno, color: cores.tintaSuave },
})
