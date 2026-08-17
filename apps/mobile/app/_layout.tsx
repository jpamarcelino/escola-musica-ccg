import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces'
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from '@expo-google-fonts/geist'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ProvedorPerfil } from '../lib/perfil'
import { ProvedorSessao } from '../lib/sessao'
import { cores, tipos } from '../lib/tema'

// O ecrã de arranque fica de pé até as fontes chegarem. Sem isto a app
// abria em Helvetica e trocava de tipo a meio — o mesmo salto que a web
// evita ao carregar as fontes no servidor.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Falha se o ecrã de arranque já tiver desaparecido. Não é motivo para
  // rebentar com a app.
})

export default function LayoutRaiz() {
  const [fontesProntas, erroFontes] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
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
      <ProvedorSessao>
        <ProvedorPerfil>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: cores.papel },
            headerTintColor: cores.azulFundo,
            headerTitleStyle: { fontFamily: tipos.display, fontSize: 17, color: cores.tinta },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: cores.papel },
          }}
        >
          <Stack.Screen name="entrar" options={{ headerShown: false }} />
          <Stack.Screen name="registo" options={{ headerShown: false }} />
          <Stack.Screen name="recuperar-password" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
        </ProvedorPerfil>
      </ProvedorSessao>
    </SafeAreaProvider>
  )
}
