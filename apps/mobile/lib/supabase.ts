import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

// O cliente Supabase da app. É o único sítio da app móvel que conhece
// chaves, e é de propósito: os pacotes partilhados recebem este cliente
// por parâmetro e nunca criam o seu (ver packages/data/src/cliente.ts).
//
// SÓ A CHAVE ANÓNIMA ENTRA AQUI. A `service role key` ignora todas as
// regras de RLS, e tudo o que vai num bundle de app móvel é código
// entregue ao telemóvel de quem a instala — qualquer pessoa lhe consegue
// chegar. Uma chave dessas num telemóvel é acesso total à base de dados
// de uma escola, com contactos e moradas de crianças. A chave anónima é
// pública por desenho: quem manda no que ela vê são as políticas de RLS,
// as mesmas que já protegem a web.
//
// O prefixo EXPO_PUBLIC_ diz exactamente isso — a Expo substitui estas
// variáveis no bundle em tempo de compilação, portanto tudo o que leve
// esse prefixo é público. Uma variável sem o prefixo simplesmente não
// chega aqui, o que é a protecção que queremos.

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const chaveAnonima = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !chaveAnonima) {
  // Falhar aqui, e com o nome das variáveis, poupa meia hora a quem
  // clonar o repositório: o erro do Supabase sem isto é um "Invalid URL"
  // sem contexto nenhum.
  throw new Error(
    'Faltam as variáveis EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copia o apps/mobile/.env.example para .env e preenche-as.'
  )
}

export const supabase = createClient(url, chaveAnonima, {
  auth: {
    // Na web a sessão vive em cookies; aqui vive no armazenamento do
    // telemóvel. É a única diferença real entre as duas apps no que toca
    // a dados — e é por isso que o packages/data recebe o cliente feito
    // em vez de o construir.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Não há URL de retorno numa app nativa: a sessão não vem no endereço.
    detectSessionInUrl: false,
  },
})
