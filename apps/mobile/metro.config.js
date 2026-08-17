// Metro num workspace pnpm.
//
// Por omissão o Metro só olha para a pasta da app. Aqui os pacotes
// partilhados vivem dois níveis acima e são ligações simbólicas para
// packages/*, que é como o pnpm liga um workspace — sem esta configuração
// o bundle falha a resolver `@ccg/core` mesmo com o TypeScript contente.
//
// São três coisas, e cada uma resolve um problema diferente:
//
//   watchFolders       diz ao Metro que a raiz do monorepo faz parte do
//                      projeto — sem isto, guardar um ficheiro em
//                      packages/core não recarrega a app
//
//   nodeModulesPaths   onde procurar dependências; o pnpm põe uma parte
//                      na app e outra na raiz
//
//   unstable_enableSymlinks  o pnpm liga tudo por symlink; sem isto o
//                      Metro segue o caminho e perde-se
//
// Os pacotes partilhados são publicados em TypeScript, sem passo de build
// (ver ARQUITETURA.md). O Metro compila-os como compila o resto da app,
// por isso não é preciso mais nada para os consumir.

const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const pastaApp = __dirname
const raizMonorepo = path.resolve(pastaApp, '../..')

const config = getDefaultConfig(pastaApp)

config.watchFolders = [raizMonorepo]

config.resolver.nodeModulesPaths = [
  path.resolve(pastaApp, 'node_modules'),
  path.resolve(raizMonorepo, 'node_modules'),
]

config.resolver.unstable_enableSymlinks = true

// A busca hierárquica fica LIGADA, ao contrário do que se costuma
// escrever para monorepos. Esse conselho é para o npm e o yarn, que
// achatam tudo numa pasta só e onde desligá-la evita apanhar a versão
// errada. O pnpm faz o contrário: aninha cada dependência na sua pasta,
// e desligar a busca hierárquica deixa o Metro sem forma de as encontrar.
// Foi o que aconteceu — o bundle falhou a resolver o @expo/metro-runtime
// a partir de dentro do expo-router.

module.exports = config
