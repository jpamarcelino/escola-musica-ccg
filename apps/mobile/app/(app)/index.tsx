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
  const horaAgora = `${String(agora.getHours()).padStart(2, '0')}:${String(
    agora.getMinutes()
  ).padStart(2, '0')}`

  // O cartão grande mostra sempre alguma coisa: o que está a decorrer e,
  // na falta disso, o que vem a seguir. Um ecrã que só ganha vida durante
  // os cinquenta minutos de uma aula está apagado o resto do dia — e a
  // maior parte das vezes que se abre a app não é a meio de uma aula.
  //
  // A primeira por acontecer é a primeira cujo fim ainda não passou, o
  // que apanha de graça a que está a decorrer agora.
  const porAcontecer = linhas.filter(
    (l) => l.data > hoje || (l.data === hoje && l.horaFim.slice(0, 5) > horaAgora)
  )
  const destaque = porAcontecer[0]
  const aDecorrer =
    destaque != null &&
    estadoTemporalAula(destaque.data, destaque.horaInicio, destaque.horaFim, agora) === 'agora'

  const deHoje = linhas.filter((l) => l.data === hoje && l.chave !== destaque?.chave)
  const aSeguir = linhas
    .filter((l) => l.data > hoje && l.chave !== destaque?.chave)
    .slice(0, 4)

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

      {destaque ? (
        <CartaoDestaque
          linha={destaque}
          agora={agora}
          hoje={hoje}
          aDecorrer={aDecorrer}
          acao={
            aDecorrer && professor && destaque.horarioId
              ? {
                  rotulo: 'Marcar presença',
                  destino: `/professor/presencas/${destaque.horarioId}`,
                }
              : { rotulo: 'Ver na agenda', destino: '/agenda' }
          }
        />
      ) : null}

      {deHoje.length > 0 ? (
        <>
          <Text style={estilos.seccao}>{destaque ? 'Ainda hoje' : 'Hoje'}</Text>
          {deHoje.map((l) => (
            <LinhaAula key={l.chave} linha={l} />
          ))}
        </>
      ) : null}

      {/* Dizer que hoje não há nada, mesmo quando o cartão já mostra o de
          amanhã. Sem isto, quem abre a app a meio da manhã vê uma aula
          de amanhã em destaque e fica sem saber se lhe escapou alguma
          coisa hoje. */}
      {deHoje.length === 0 && destaque?.data !== hoje ? (
        <>
          <Text style={estilos.seccao}>Hoje</Text>
          <Text style={estilos.vazio}>
            {professor
              ? 'Nenhuma aula marcada para hoje na tua agenda.'
              : 'Nenhuma aula marcada para hoje.'}
          </Text>
        </>
      ) : null}

      {aSeguir.length > 0 && (
        <>
          {/* "Depois" e não "A seguir": o cartão de cima já é o que vem
              a seguir, e dois títulos iguais no mesmo ecrã fazem duvidar
              de qual é qual. Só quando o cartão mostra uma aula a
              decorrer é que o que vem abaixo é mesmo o seguinte. */}
          <Text style={estilos.seccao}>{aDecorrer ? 'A seguir' : 'Depois'}</Text>
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

// O cartão do que vem já.
//
// Contorno ciano, hora grande em mono e uma ação lá dentro. É a única
// coisa do ecrã com peso, e é de propósito: quem abre a app a meio do
// dia quer saber uma coisa — o que é a seguir — e não quer ler uma lista
// para descobrir.
//
// Mostra o que está a decorrer quando há, e o que vem a seguir quando não
// há. A diferença está na etiqueta, no que se lê à direita e na barra: a
// barra só existe enquanto há alguma coisa a progredir. Uma barra vazia
// num cartão do que ainda não começou parece avaria, não informação.
function CartaoDestaque({
  linha,
  agora,
  hoje,
  aDecorrer,
  acao,
}: {
  linha: Linha
  agora: Date
  hoje: string
  aDecorrer: boolean
  acao: { rotulo: string; destino: string }
}) {
  const estilos = useEstilos(criarEstilos)
  const { cores } = useTema()

  const decorrido = minutosDesde(linha.horaInicio, agora)
  const total = minutosEntre(linha.horaInicio, linha.horaFim)
  const fracao = total > 0 ? Math.min(1, Math.max(0, decorrido / total)) : 0

  return (
    <View style={estilos.destaque}>
      <View style={estilos.destaqueTopo}>
        <View style={estilos.etiqueta}>
          {aDecorrer ? <View style={estilos.ponto} /> : null}
          <Text style={estilos.etiquetaTexto}>{aDecorrer ? 'A decorrer' : 'A seguir'}</Text>
        </View>
        <Text style={estilos.quando}>{quandoDizer(linha, agora, hoje, aDecorrer)}</Text>
      </View>

      <View style={estilos.destaqueLinha}>
        <Text style={estilos.destaqueHora}>{formatarHora(linha.horaInicio)}</Text>
        <Text style={estilos.destaqueTitulo} numberOfLines={1}>
          {linha.titulo}
        </Text>
      </View>

      <Text style={estilos.destaqueMeta}>
        {[linha.detalhe, linha.sala, `até ${formatarHora(linha.horaFim)}`]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      {aDecorrer ? (
        <View style={estilos.barra}>
          <View style={[estilos.barraCheia, { width: `${fracao * 100}%` }]} />
        </View>
      ) : null}

      <Link href={acao.destino as never} asChild>
        <Pressable accessibilityRole="button" style={estilos.destaqueBotao}>
          <Text style={[estilos.destaqueBotaoTexto, { color: cores.botaoTexto }]}>
            {acao.rotulo}
          </Text>
        </Pressable>
      </Link>
    </View>
  )
}

// O que se lê no canto direito. Enquanto decorre, quanto falta; antes de
// começar, daqui a quanto. Depois de "amanhã" passa a dizer-se a data:
// "daqui a 39 h" não é coisa que alguém consiga usar.
function quandoDizer(linha: Linha, agora: Date, hoje: string, aDecorrer: boolean): string {
  if (aDecorrer) {
    const faltam = Math.max(0, minutosEntre(linha.horaInicio, linha.horaFim) - minutosDesde(linha.horaInicio, agora))
    return faltam === 0 ? 'a terminar' : `faltam ${faltam} min`
  }

  if (linha.data === hoje) {
    const minutos = Math.max(0, -minutosDesde(linha.horaInicio, agora))
    if (minutos < 60) return `daqui a ${minutos} min`
    const horas = Math.floor(minutos / 60)
    const resto = minutos % 60
    return resto === 0 ? `daqui a ${horas} h` : `daqui a ${horas} h ${resto}`
  }

  const amanha = new Date(`${hoje}T12:00:00`)
  amanha.setDate(amanha.getDate() + 1)
  if (linha.data === amanha.toISOString().slice(0, 10)) return 'amanhã'

  return formatarDataEscolar(linha.data, { day: 'numeric', month: 'long' })
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

    destaque: {
      gap: espaco.s,
      padding: espaco.m,
      borderRadius: raio.cartao,
      borderWidth: 1.5,
      borderColor: cores.ciano,
      backgroundColor: cores.cartao,
    },
    destaqueTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    etiqueta: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
    ponto: { width: 9, height: 9, borderRadius: 5, backgroundColor: cores.ciano },
    etiquetaTexto: { ...texto.cartao, color: cores.ciano },
    // Em mono porque é um número que muda sozinho: alinhado, não dança
    // de largura a cada minuto que passa.
    quando: { ...texto.horaLista, color: cores.tintaSuave },
    destaqueLinha: { flexDirection: 'row', alignItems: 'baseline', gap: espaco.s },
    destaqueHora: { ...texto.hora, color: cores.tinta },
    destaqueTitulo: { ...texto.seccao, fontSize: 21, lineHeight: 26, color: cores.tinta, flex: 1 },
    destaqueMeta: { ...texto.pequeno, color: cores.tintaSuave },
    barra: { height: 6, borderRadius: 3, backgroundColor: cores.cartaoSuave, overflow: 'hidden' },
    barraCheia: { height: 6, borderRadius: 3, backgroundColor: cores.ciano },
    // Pílula e não barra de largura inteira: é uma ação entre outras
    // coisas do cartão, não o fim de um formulário.
    destaqueBotao: {
      alignSelf: 'flex-start',
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: espaco.l,
      borderRadius: raio.capsula,
      backgroundColor: cores.botao,
      marginTop: espaco.xs,
    },
    destaqueBotaoTexto: { ...texto.cartao },

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
