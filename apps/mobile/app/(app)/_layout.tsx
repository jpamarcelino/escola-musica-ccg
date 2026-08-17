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
import { usePerfil } from '../../lib/perfil'
import { useSessao } from '../../lib/sessao'
import { cores, tipos } from '../../lib/tema'

// Os mesmos cinco separadores da web, e a mesma regra a separá-los: uma
// Conta CCG gere alunos (Hoje, Agenda, Alunos, Avisos, Conta) e um
// professor dá aulas (Hoje, Agenda, Presenças, Pedidos, Conta).
//
// Os separadores que não pertencem ao papel de quem entrou não são
// escondidos com um `if` à volta do ecrã — recebem `href: null`, que os
// tira da barra e impede a navegação para eles. Um ecrã que existe mas
// não devia ser alcançável é uma porta que alguém acaba por encontrar.
export default function LayoutApp() {
  const { sessao, aCarregar: sessaoACarregar } = useSessao()
  const { perfil, aCarregar: perfilACarregar } = usePerfil()

  if (sessaoACarregar || perfilACarregar) return <ACarregar />
  // Sem sessão, a app abre na descoberta e não no login — tal como a
  // web abre em "/" e não em "/login". Quem chega sem conta tem de ver
  // primeiro o que a escola faz; pedir credenciais a quem ainda não sabe
  // o que isto é fecha a porta antes de a mostrar.
  if (!sessao) return <Redirect href="/descobrir" />

  const professor = ehProfessor(perfil?.tipo)

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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color, focused }) => (
            <IconeCasa color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
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
          href: professor ? null : '/alunos',
          tabBarIcon: ({ color, focused }) => (
            <IconeAlunos color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          href: professor ? null : '/avisos',
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
          href: professor ? '/presencas' : null,
          tabBarIcon: ({ color, focused }) => (
            <IconePresencas color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          href: professor ? '/pedidos' : null,
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
