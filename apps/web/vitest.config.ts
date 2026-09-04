import { defineConfig } from 'vitest/config'

// Os testes de Playwright vivem em `e2e/` e correm com `test:e2e`.
// Sem esta exclusao o vitest tentava carrega-los e rebentava — os dois
// definem `test`, mas nao sao a mesma coisa.
export default defineConfig({
  test: {
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
})
