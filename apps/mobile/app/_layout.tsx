import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono'
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ProvedorModo } from '../lib/modo'
import { ProvedorPerfil } from '../lib/perfil'
import { ProvedorSessao } from '../lib/sessao'
import { tipos } from '../lib/tema'
import { ProvedorTema, useTema } from '../lib/tema-contexto'

// O ecrã de arranque fica de pé até as fontes chegarem. Sem isto a app
// abria em Helvetica e trocava de tipo a meio — o mesmo salto que a web
// evita ao carregar as fontes no servidor.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Falha se o ecrã de arranque já tiver desaparecido. Não é motivo para
  // rebentar com a app.
})

export default function LayoutRaiz() {
  // Manrope em tudo, IBM Plex Mono só para horas, datas e números. O
  // Fraunces saiu: um serifado de display não sobrevive a uma interface
  // que passou a ser sobretudo listas e horas.
  const [fontesProntas, erroFontes] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_800ExtraBold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  })

  useEffect(() => {
    // Também esconde o ecrã de arranque quando as fontes falham: ficar
    // preso num ecrã em branco é pior do que a app aparecer com o tipo
    // do sistema.
    if (fontesProntas || erroFontes) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [fontesProntas, erroFontes])

  if (!fontesProntas && !erroFontes) return null

  return (
    <SafeAreaProvider>
      {/* O tema por dentro da sessão, e não por fora: é a sessão que
          decide se a preferência guardada vale. Sem conta, vale o
          telemóvel. */}
      <ProvedorSessao>
        <ProvedorTema>
          <ProvedorPerfil>
            <ProvedorModo>
              <Navegacao />
            </ProvedorModo>
          </ProvedorPerfil>
        </ProvedorTema>
      </ProvedorSessao>
    </SafeAreaProvider>
  )
}

// A navegação vive à parte do LayoutRaiz por uma razão simples: quem
// fornece o tema não o pode consumir. O useTema só lê o que estiver
// acima dele na árvore, e o ProvedorTema é desenhado aqui — as opções
// do Stack tinham de sair para dentro de um filho.
function Navegacao() {
  const { cores, esquema } = useTema()

  return (
    <>
      {/* A barra de estado segue o tema: no escuro os ícones do sistema
          têm de ser claros, senão ficam pretos sobre um fundo preto. */}
      <StatusBar style={esquema === 'escuro' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: cores.papel },
          headerTintColor: cores.azulFundo,
          headerTitleStyle: { fontFamily: tipos.corpoMedio, fontSize: 17, color: cores.tinta },
          headerShadowVisible: false,
          // Só a seta, sem legenda. Por omissão o iOS escreve ao lado da
          // seta o nome do ecrã anterior, e o ecrã anterior destes é o
          // grupo de rotas — dava um botão a dizer "(app)", que é nome de
          // pasta do código e não diz nada a ninguém. Pior: parecia avaria,
          // ao ponto de se duvidar que o botão sequer funcionasse.
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: cores.papel },
        }}
      >
        <Stack.Screen name="descobrir" options={{ headerShown: false }} />
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
        <Stack.Screen name="registo" options={{ headerShown: false }} />
        <Stack.Screen name="recuperar-password" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
