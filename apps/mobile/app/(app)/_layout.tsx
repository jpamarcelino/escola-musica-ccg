import { ehProfessor } from '@ccg/data'
import { Redirect, Tabs } from 'expo-router'
import {
  IconeAlunos,
  IconeCalendario,
  IconeCasa,
  IconePedidos,
  IconePerfil,
  IconePresencas,
  IconeSino,
} from '../../componentes/icones'
import { ACarregar } from '../../componentes/base'
import { useModo } from '../../lib/modo'
import { usePerfil } from '../../lib/perfil'
import { useSessao } from '../../lib/sessao'
import { tipos } from '../../lib/tema'
import { useTema } from '../../lib/tema-contexto'

// Os mesmos cinco separadores da web, e a mesma regra a separá-los: uma
// Conta CCG gere alunos (Hoje, Agenda, Alunos, Avisos, Conta) e um
// professor dá aulas (Hoje, Agenda, Presenças, Pedidos, Conta).
//
// A administração é o terceiro conjunto, e não se soma aos outros: é um
// modo que se liga na Conta e substitui a barra inteira (Escola, Alunos,
// Professores, Recomendações, Conta). Antes era um separador permanente
// chamado "Escola" encostado aos outros cinco — seis separadores numa
// barra de telemóvel, e a gestão da escola a um toque acidental de quem
// só queria ver as aulas do dia.
//
// Os separadores que não pertencem ao papel nem ao modo de quem entrou
// não são escondidos com um `if` à volta do ecrã — recebem `href: null`,
// que os tira da barra e impede a navegação para eles. Um ecrã que existe
// mas não devia ser alcançável é uma porta que alguém acaba por encontrar.
export default function LayoutApp() {
  const { cores } = useTema()
  const { sessao, aCarregar: sessaoACarregar } = useSessao()
  const { perfil, aCarregar: perfilACarregar } = usePerfil()
  const { modoAdmin, aCarregar: modoACarregar } = useModo()

  if (sessaoACarregar || perfilACarregar || modoACarregar) return <ACarregar />
  // Sem sessão, a app abre na descoberta e não no login — tal como a
  // web abre em "/" e não em "/login". Quem chega sem conta tem de ver
  // primeiro o que a escola faz; pedir credenciais a quem ainda não sabe
  // o que isto é fecha a porta antes de a mostrar.
  if (!sessao) return <Redirect href="/descobrir" />

  const professor = ehProfessor(perfil?.tipo)
  // A administração é uma marca no perfil e não um tipo: um professor
  // pode ser administrador. `admin` diz se a pessoa pode administrar;
  // `modoAdmin` diz se está a fazê-lo agora.
  const admin = perfil?.admin === true
  // O modo só vale para quem tem a marca. A dupla verificação é de
  // propósito: se o perfil mudar em memória sem o modo ainda ter sido
  // reposto, a barra nunca chega a mostrar administração a quem não é.
  const gerir = admin && modoAdmin

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.papel },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: tipos.display, fontSize: 17, color: cores.tinta },
        sceneStyle: { backgroundColor: cores.papel },
        tabBarActiveTintColor: cores.azulFundo,
        tabBarInactiveTintColor: cores.tintaSuave,
        tabBarStyle: {
          backgroundColor: cores.papel,
          borderTopColor: cores.linha,
        },
        tabBarLabelStyle: { fontFamily: tipos.corpoMedio, fontSize: 11 },
      }}
    >
      {/* Do dia a dia — fora do modo de administração */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoje',
          href: gerir ? null : '/',
          tabBarIcon: ({ color, focused }) => (
            <IconeCasa color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          href: gerir ? null : '/agenda',
          tabBarIcon: ({ color, focused }) => (
            <IconeCalendario color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />

      {/* Só da Conta CCG */}
      <Tabs.Screen
        name="alunos"
        options={{
          title: 'Alunos',
          href: professor || gerir ? null : '/alunos',
          tabBarIcon: ({ color, focused }) => (
            <IconeAlunos color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          href: professor || gerir ? null : '/avisos',
          tabBarIcon: ({ color, focused }) => (
            <IconeSino color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />

      {/* Só do professor */}
      <Tabs.Screen
        name="presencas"
        options={{
          title: 'Presenças',
          href: professor && !gerir ? '/presencas' : null,
          tabBarIcon: ({ color, focused }) => (
            <IconePresencas color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          href: professor && !gerir ? '/pedidos' : null,
          tabBarIcon: ({ color, focused }) => (
            <IconePedidos color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />

      {/* Só no modo de administração */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Escola',
          href: gerir ? '/admin' : null,
          tabBarIcon: ({ color, focused }) => (
            <IconeCasa color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin/alunos"
        options={{
          title: 'Alunos',
          href: gerir ? '/admin/alunos' : null,
          tabBarIcon: ({ color, focused }) => (
            <IconeAlunos color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin/professores"
        options={{
          title: 'Professores',
          href: gerir ? '/admin/professores' : null,
          tabBarIcon: ({ color, focused }) => (
            <IconePresencas color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin/recomendacoes"
        options={{
          title: 'Recomendações',
          href: gerir ? '/admin/recomendacoes' : null,
          tabBarIcon: ({ color, focused }) => (
            <IconePedidos color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />

      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, focused }) => (
            <IconePerfil color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
    </Tabs>
  )
}
