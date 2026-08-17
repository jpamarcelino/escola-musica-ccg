import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useSessao } from '../lib/sessao'
import { cores } from '../lib/tema'

// Ecrã de entrada: decide para onde a pessoa vai. Enquanto a sessão não
// chega do armazenamento do telemóvel, não decide nada — mandar para o
// login sem ter olhado seria pôr a entrar de novo quem já estava dentro.
export default function Entrada() {
  const { sessao, aCarregar } = useSessao()

  if (aCarregar) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={cores.cianoTexto} />
      </View>
    )
  }

  return <Redirect href={sessao ? '/alunos' : '/entrar'} />
}
