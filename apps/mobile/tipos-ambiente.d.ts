// As duas variáveis de ambiente que a app lê, declaradas à mão.
//
// A Expo gera um `expo-env.d.ts` que faz isto, mas é um ficheiro que ela
// própria reescreve e apaga conforme os comandos que se correm — já
// desapareceu uma vez a meio deste trabalho, levando o typecheck com
// ele. Este ficheiro é nosso e fica.
//
// Declarar só estas duas, em vez de puxar os tipos todos do Node, é
// também mais honesto: numa app React Native não há `process` completo,
// e só estas chegam ao bundle (é o que o prefixo EXPO_PUBLIC_ significa).
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string
  }
}
