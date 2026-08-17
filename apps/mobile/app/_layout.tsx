import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ProvedorSessao } from '../lib/sessao'
import { cores } from '../lib/tema'

export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <ProvedorSessao>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: cores.fundo },
            headerTintColor: cores.texto,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: cores.fundo },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="entrar" options={{ title: 'Entrar' }} />
          <Stack.Screen name="alunos" options={{ title: 'Os teus alunos' }} />
          <Stack.Screen name="aluno/[alunoId]" options={{ title: 'Aulas' }} />
          <Stack.Screen name="notificacoes" options={{ title: 'Avisos' }} />
        </Stack>
      </ProvedorSessao>
    </SafeAreaProvider>
  )
}
