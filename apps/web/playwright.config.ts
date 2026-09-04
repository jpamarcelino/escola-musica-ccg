import { defineConfig, devices } from '@playwright/test'

// Smoke tests de navegacao (Fase 2 do CLAUDE_PROXIMAS_FASES.md).
//
// O alvo e configuravel. Por omissao aponta para producao, porque e a
// unica instancia sempre a correr — e porque os testes publicos sao de
// leitura: abrem paginas, medem larguras e trocam o tema, que vive no
// localStorage do proprio browser de teste. Nenhum deles submete
// formularios nem escreve nada na base de dados.
//
// Para correr contra o servidor local:
//   E2E_URL=http://localhost:3000 pnpm --filter web test:e2e
const baseURL = process.env.E2E_URL ?? 'https://escola-musica-ccg.vercel.app'

// As duas larguras que o guia manda verificar em desktop e telemovel.
// Os 360 e 430 px ficam para os testes que os pedem explicitamente, com
// `page.setViewportSize` — repetir o projeto inteiro tres vezes so para
// medir overflow tornava a suite lenta sem apanhar mais nada.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Producao esta atras da CDN da Vercel; um arranque a frio pode
    // demorar mais do que o valor de fabrica.
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'telemovel',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
})
