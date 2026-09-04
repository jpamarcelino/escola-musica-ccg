import { test, expect, type Page } from '@playwright/test'

// Os percursos com sessao (Fase 1 e Fase 2 do CLAUDE_PROXIMAS_FASES.md).
//
// As credenciais vem SO do ambiente e nunca do repositorio. Sem elas os
// testes saltam com um aviso em vez de falharem: uma suite vermelha por
// falta de configuracao ensina toda a gente a ignorar o vermelho.
//
//   E2E_PROF_EMAIL=... E2E_PROF_PASSWORD=... \
//   E2E_FAMILIA_EMAIL=... E2E_FAMILIA_PASSWORD=... \
//   pnpm --filter web test:e2e
//
// Guardar isso num `.env.e2e.local` fora do controlo de versoes, ou
// exportar na shell. Nao commitar.

type Papel = 'prof' | 'familia' | 'admin'

function credenciais(papel: Papel) {
  const prefixo = `E2E_${papel.toUpperCase()}`
  return {
    email: process.env[`${prefixo}_EMAIL`],
    password: process.env[`${prefixo}_PASSWORD`],
  }
}

async function entrar(page: Page, papel: Papel) {
  const { email, password } = credenciais(papel)
  await page.goto('/login')
  await page.getByLabel('Email').fill(email as string)
  await page.getByLabel('Password').fill(password as string)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/(dashboard|admin)/)
}

function descreverPapel(papel: Papel, corpo: () => void) {
  test.describe(papel, () => {
    const { email, password } = credenciais(papel)
    test.skip(
      !email || !password,
      `sem E2E_${papel.toUpperCase()}_EMAIL / _PASSWORD no ambiente`
    )
    corpo()
  })
}

async function excessoHorizontal(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}

// As rotas de cada papel, para a varredura de overflow e consola. E a
// parte mecanica da validacao — a que ninguem faz a mao rota a rota, e
// por isso a que mais vale automatizar. O julgamento visual continua a
// ser humano.
const ROTAS: Record<Papel, string[]> = {
  familia: [
    '/dashboard',
    '/dashboard/agenda',
    '/dashboard/alunos',
    '/dashboard/avisos',
    '/dashboard/calendario',
    '/dashboard/materiais',
    '/dashboard/mensalidades',
    '/dashboard/conta',
    '/dashboard/conta/avancado',
  ],
  prof: [
    '/dashboard',
    '/dashboard/agenda',
    '/dashboard/agenda/semana',
    '/dashboard/horarios',
    '/dashboard/meus-alunos',
    '/dashboard/pedidos',
    '/dashboard/presencas',
    '/dashboard/presencas/confirmar',
    '/dashboard/presencas/historico',
    '/dashboard/reposicoes',
    '/dashboard/mensagens',
    '/dashboard/enviar-material',
    '/dashboard/mensalidades',
  ],
  admin: [
    '/admin',
    '/admin/alunos',
    '/admin/professores',
    '/admin/pagamentos',
    '/admin/avisos',
    '/admin/mensagens',
    '/admin/recomendacoes',
    '/admin/bebes',
  ],
}

for (const papel of ['familia', 'prof', 'admin'] as const) {
  descreverPapel(papel, () => {
    for (const tema of ['claro', 'escuro'] as const) {
      test(`${papel}: as rotas abrem no tema ${tema}, sem transbordar nem gritar`, async ({
        page,
      }) => {
        await page.addInitScript((valor) => {
          window.localStorage.setItem('ccg-aparencia', valor as string)
        }, tema)

        const erros: string[] = []
        page.on('console', (m) => {
          if (m.type() === 'error') erros.push(`${page.url()} :: ${m.text()}`)
        })
        page.on('pageerror', (e) => erros.push(`${page.url()} :: ${e}`))

        await entrar(page, papel)

        for (const rota of ROTAS[papel]) {
          await page.goto(rota)
          expect(await excessoHorizontal(page), `${rota} transborda`).toBe(0)
          await expect(page.locator('html')).toHaveAttribute('data-tema', tema)
        }

        expect(erros).toEqual([])
      })
    }

    test(`${papel}: sair da conta leva ao login e a sessão não volta atrás`, async ({ page }) => {
      await entrar(page, papel)
      await page.goto('/dashboard/conta')
      await page.getByRole('button', { name: /Sair/i }).click()
      await page.waitForURL(/\/login/)

      // Voltar atras no historico nao pode devolver a sessao.
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/login/)
    })
  })
}
