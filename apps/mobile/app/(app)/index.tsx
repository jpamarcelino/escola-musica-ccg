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
import { Link, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ACarregar } from '../../componentes/base'
import { usePerfil } from '../../lib/perfil'
import { useSessao } from '../../lib/sessao'
import { supabase } from '../../lib/supabase'
import { espaco, raio, texto, type Cores } from '../../lib/tema'
import { useEstilos, useTema } from '../../lib/tema-contexto'

// O que se passa hoje.
//
// A hierarquia é a do redesenho e responde por ordem de urgência: o que
// está a acontecer agora, o que espera resposta minha, o que vem a
// seguir. Antes era tudo cartões do mesmo tamanho com distintivos por
// cima — e um ecrã onde tudo tem o mesmo peso é um ecrã onde é preciso
// ler tudo para saber o que fazer.

type Linha = {
  chave: string
  titulo: string
  detalhe: string | null
  data: string
  horaInicio: string
  horaFim: string
  sala: string | null
  horarioId: number | null
}

export default function Hoje() {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()
  const { sessao } = useSessao()
  const { perfil } = usePerfil()
  const router = useRouter()
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
          horarioId: null,
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
  const aDecorrer = deHoje.find(
    (l) => estadoTemporalAula(l.data, l.horaInicio, l.horaFim, agora) === 'agora'
  )
  const restoDeHoje = deHoje.filter((l) => l.chave !== aDecorrer?.chave)
  const aSeguir = linhas.filter((l) => l.data > hoje).slice(0, 4)

  // Uma pergunta de cada vez. Três cartões vermelhos empilhados deixam
  // de ser urgência e passam a ser parede — o que precisa de resposta
  // aparece por ordem de quem está à espera há mais tempo.
  const resposta = professor
    ? porConfirmar > 0
      ? {
          texto: plural(porConfirmar, 'presença por marcar', 'presenças por marcar'),
          destino: '/presencas' as const,
          acao: 'Marcar agora',
        }
      : pendentes > 0
        ? {
            texto: plural(pendentes, 'pedido por responder', 'pedidos por responder'),
            destino: '/pedidos' as const,
            acao: 'Ver pedidos',
          }
        : null
    : pendentes > 0
      ? {
          texto: plural(pendentes, 'pedido à espera de resposta', 'pedidos à espera de resposta'),
          destino: '/agenda' as const,
          acao: 'Ver',
        }
      : avisos > 0
        ? {
            texto: plural(avisos, 'aviso por ler', 'avisos por ler'),
            destino: '/avisos' as const,
            acao: 'Ler',
          }
        : null

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
          tintColor={cores.ciano}
        />
      }
    >
      <View style={estilos.cabecalho}>
        <Text style={estilos.data}>
          {formatarDataEscolar(hoje, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <Text style={estilos.nome}>{primeiroNome(perfil?.nome)}</Text>
      </View>

      {resposta ? (
        <Pressable
          onPress={() => router.push(resposta.destino)}
          accessibilityRole="button"
          accessibilityLabel={`${resposta.texto}. ${resposta.acao}.`}
          style={estilos.precisa}
        >
          <View style={{ flex: 1 }}>
            <Text style={estilos.precisaTexto}>{resposta.texto}</Text>
            <Text style={estilos.precisaAcao}>{resposta.acao} →</Text>
          </View>
        </Pressable>
      ) : null}

      {aDecorrer ? (
        <CartaoAgora
          linha={aDecorrer}
          agora={agora}
          acao={
            professor && aDecorrer.horarioId
              ? { rotulo: 'Marcar presenças', destino: `/professor/presencas/${aDecorrer.horarioId}` }
              : null
          }
        />
      ) : null}

      <Text style={estilos.seccao}>{aDecorrer ? 'Ainda hoje' : 'Hoje'}</Text>
      {restoDeHoje.length === 0 ? (
        <Text style={estilos.vazio}>
          {aDecorrer
            ? 'Não há mais nada marcado para hoje.'
            : professor
              ? 'Nenhuma aula marcada para hoje na tua agenda.'
              : 'Nenhuma aula marcada para hoje.'}
        </Text>
      ) : (
        restoDeHoje.map((l) => <LinhaAula key={l.chave} linha={l} />)
      )}

      {aSeguir.length > 0 && (
        <>
          <Text style={estilos.seccao}>A seguir</Text>
          {aSeguir.map((l) => (
            <LinhaAula key={l.chave} linha={l} comData />
          ))}
        </>
      )}

      {/* Os ecrãs que não têm separador próprio. A web chega-lhes pelo
          painel do professor; aqui é pelo mesmo sítio, para quem conhece
          um lado procurar no outro onde espera. */}
      {professor && (
        <>
          <Text style={estilos.seccao}>Gerir</Text>
          <Atalho href="/professor/alunos" titulo="Alunos" nota="Quem tens, com que disciplina e quando" />
          <Atalho href="/professor/horarios" titulo="Horários" nota="A tua disponibilidade da semana" />
          <Atalho href="/professor/mensalidades" titulo="Mensalidades" nota="O que está pago e o que falta receber" />
        </>
      )}
    </ScrollView>
  )
}

// O cartão do que está a acontecer agora. Contorno ciano, hora grande em
// mono e uma barra que anda: é a única coisa no ecrã que muda sozinha, e
// é isso que a distingue de tudo o resto sem precisar de uma etiqueta.
function CartaoAgora({
  linha,
  agora,
  acao,
}: {
  linha: Linha
  agora: Date
  acao: { rotulo: string; destino: string } | null
}) {
  const estilos = useEstilos(criarEstilos)
  const decorrido = minutosDesde(linha.horaInicio, agora)
  const total = minutosEntre(linha.horaInicio, linha.horaFim)
  const fracao = total > 0 ? Math.min(1, Math.max(0, decorrido / total)) : 0
  const faltam = Math.max(0, total - decorrido)

  return (
    <View style={estilos.agora}>
      <View style={estilos.agoraTopo}>
        <Text style={estilos.agoraHora}>{formatarHora(linha.horaInicio)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={estilos.agoraTitulo}>{linha.titulo}</Text>
          {(linha.detalhe || linha.sala) && (
            <Text style={estilos.agoraDetalhe}>
              {[linha.detalhe, linha.sala].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
      </View>

      <View style={estilos.barra}>
        <View style={[estilos.barraCheia, { width: `${fracao * 100}%` }]} />
      </View>
      <Text style={estilos.agoraFaltam}>
        {faltam === 0 ? 'A terminar' : `Faltam ${plural(faltam, 'minuto', 'minutos')}`}
      </Text>

      {acao ? (
        <Link href={acao.destino as never} asChild>
          <Pressable accessibilityRole="button" style={estilos.agoraBotao}>
            <Text style={estilos.agoraBotaoTexto}>{acao.rotulo}</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  )
}

function LinhaAula({ linha, comData }: { linha: Linha; comData?: boolean }) {
  const estilos = useEstilos(criarEstilos)
  return (
    <View style={estilos.linha}>
      <Text style={estilos.linhaHora}>{formatarHora(linha.horaInicio)}</Text>
      <View style={{ flex: 1 }}>
        <Text style={estilos.linhaTitulo}>{linha.titulo}</Text>
        {(linha.detalhe || linha.sala || comData) && (
          <Text style={estilos.linhaDetalhe}>
            {[comData ? formatarDataEscolar(linha.data) : null, linha.detalhe, linha.sala]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </View>
    </View>
  )
}

function Atalho({ href, titulo, nota }: { href: string; titulo: string; nota: string }) {
  const estilos = useEstilos(criarEstilos)
  return (
    <Link href={href as never} asChild>
      <Pressable accessibilityRole="button" accessibilityLabel={titulo} style={estilos.linha}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.linhaTitulo}>{titulo}</Text>
          <Text style={estilos.linhaDetalhe}>{nota}</Text>
        </View>
        <Text style={estilos.seta}>›</Text>
      </Pressable>
    </Link>
  )
}

function minutosEntre(inicio: string, fim: string): number {
  return paraMinutos(fim) - paraMinutos(inicio)
}

function minutosDesde(inicio: string, agora: Date): number {
  return agora.getHours() * 60 + agora.getMinutes() - paraMinutos(inicio)
}

function paraMinutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(':').map(Number)
  return h * 60 + m
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
        horarioId: a.horario_final_id,
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

const criarEstilos = (cores: Cores) =>
  StyleSheet.create({
    conteudo: { padding: espaco.m, gap: espaco.s, paddingBottom: espaco.xxl },

    cabecalho: { marginBottom: espaco.s },
    data: { ...texto.pequeno, color: cores.tintaSuave },
    nome: { ...texto.titulo, color: cores.tinta },

    precisa: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      padding: espaco.m,
      borderRadius: raio.cartao,
      borderWidth: 1,
      borderColor: cores.alertaLinha,
      backgroundColor: cores.alertaFundo,
    },
    precisaTexto: { ...texto.cartao, color: cores.alerta },
    precisaAcao: { ...texto.pequeno, color: cores.alerta, marginTop: 2 },

    agora: {
      gap: espaco.s,
      padding: espaco.m,
      borderRadius: raio.cartao,
      borderWidth: 1.5,
      borderColor: cores.ciano,
      backgroundColor: cores.cartao,
    },
    agoraTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
    agoraHora: { ...texto.hora, color: cores.ciano },
    agoraTitulo: { ...texto.cartao, color: cores.tinta },
    agoraDetalhe: { ...texto.pequeno, color: cores.tintaSuave },
    barra: { height: 4, borderRadius: 2, backgroundColor: cores.cartaoSuave, overflow: 'hidden' },
    barraCheia: { height: 4, borderRadius: 2, backgroundColor: cores.ciano },
    agoraFaltam: { ...texto.pequeno, color: cores.tintaSuave },
    agoraBotao: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: raio.botao,
      backgroundColor: cores.botao,
    },
    agoraBotaoTexto: { ...texto.cartao, color: cores.botaoTexto },

    seccao: { ...texto.seccao, color: cores.tintaSuave, marginTop: espaco.m },
    vazio: { ...texto.corpo, color: cores.tintaSuave },

    linha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espaco.m,
      minHeight: 64,
      paddingHorizontal: espaco.m,
      paddingVertical: espaco.s,
      borderRadius: raio.cartao,
      backgroundColor: cores.cartao,
      borderWidth: 1,
      borderColor: cores.linha,
    },
    linhaHora: { ...texto.horaLista, color: cores.tintaSuave },
    linhaTitulo: { ...texto.cartao, color: cores.tinta },
    linhaDetalhe: { ...texto.pequeno, color: cores.tintaSuave },
    seta: { fontSize: 20, color: cores.tintaSuave },
  })
