import { ehProfessor } from '@ccg/data'
import { Redirect, Tabs } from 'expo-router'
// Um import por ícone, e não do pacote inteiro. O `lucide-react-native`
// exporta tudo a partir de um ficheiro único e o Metro não elimina o que
// não se usa: importar sete ícones pelo nome trazia os mais de mil e
// quinhentos, e com eles 2 MB para dentro da app.
import Bell from 'lucide-react-native/icons/bell'
import CalendarDays from 'lucide-react-native/icons/calendar-days'
import ClipboardCheck from 'lucide-react-native/icons/clipboard-check'
import House from 'lucide-react-native/icons/house'
import Inbox from 'lucide-react-native/icons/inbox'
import UserRound from 'lucide-react-native/icons/user-round'
import Users from 'lucide-react-native/icons/users'
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
  if (!sessao) return <Redirect href="/entrar" />

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
            <House color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, focused }) => (
            <CalendarDays color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
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
            <Users color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          href: professor ? null : '/avisos',
          tabBarIcon: ({ color, focused }) => (
            <Bell color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
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
            <ClipboardCheck color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          href: professor ? '/pedidos' : null,
          tabBarIcon: ({ color, focused }) => (
            <Inbox color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />

      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, focused }) => (
            <UserRound color={color} size={22} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
    </Tabs>
  )
}
