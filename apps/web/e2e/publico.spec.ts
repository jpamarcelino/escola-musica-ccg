import { test, expect, type Page } from '@playwright/test'

// As rotas publicas, nos dois temas.
//
// Estas correm sem credenciais nenhumas, e e por isso que existem
// primeiro: sao a rede de seguranca do trabalho publico feito ate agora.
// Dois agentes escrevem na mesma branch e o `globals.css` tem mais de dez
// mil linhas — uma regra nova apanha facilmente um seletor largo escrito
// meses antes, e ninguem da por isso ate alguem abrir a pagina.

const ROTAS = [
  { caminho: '/', titulo: 'Onde começa uma prática.' },
  { caminho: '/pedir-aula?programa=musica&idade=8', titulo: 'Que instrumento queres aprender?' },
  { caminho: '/login', titulo: 'Entrar' },
  { caminho: '/registo', titulo: 'Criar Conta CCG' },
  { caminho: '/esqueci-password', titulo: 'Recuperar password' },
  { caminho: '/confirmar-email', titulo: 'Confirma o teu email' },
  { caminho: '/instalar', titulo: 'Instalar a app' },
  { caminho: '/legal', titulo: 'Informação legal' },
  { caminho: '/legal/privacidade', titulo: 'Política de Privacidade' },
]

// O tema escreve-se antes de a pagina abrir. Escrito depois, apanhava-se
// o ecra a mudar de cor a meio do teste e mediam-se cores erradas.
async function comTema(page: Page, tema: 'claro' | 'escuro') {
  await page.addInitScript((valor) => {
    window.localStorage.setItem('ccg-aparencia', valor as string)
  }, tema)
}

async function excessoHorizontal(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement
    return de.scrollWidth - de.clientWidth
  })
}

for (const tema of ['claro', 'escuro'] as const) {
  test.describe(`tema ${tema}`, () => {
    for (const rota of ROTAS) {
      test(`${rota.caminho} abre e não transborda`, async ({ page }) => {
        await comTema(page, tema)
        await page.goto(rota.caminho)

        await expect(page.getByRole('heading', { name: rota.titulo })).toBeVisible()
        expect(await excessoHorizontal(page)).toBe(0)

        // O tema tem de estar aplicado no <html> antes de a pagina pintar
        // — e o que evita o clarao branco de quem tem o sistema escuro.
        await expect(page.locator('html')).toHaveAttribute('data-tema', tema)
      })
    }

    test('nenhuma página pública deixa erros na consola', async ({ page }) => {
      // Excepcoes de JavaScript e erros escritos pela app. O ruido de rede
      // fica de fora: a suite corre contra producao, em paralelo, e um
      // recurso que falhe a carregar por causa da CDN aparece na consola
      // como erro sem ter nada a ver com o codigo. Deixa-lo dentro dava um
      // teste que falha sozinho de vez em quando — e um teste desses ensina
      // toda a gente a ignorar o vermelho.
      const RUIDO_DE_REDE =
        /Failed to load resource|net::ERR_|ERR_NETWORK|the server responded with a status of/i

      const erros: string[] = []
      page.on('console', (m) => {
        if (m.type() !== 'error') return
        const texto = m.text()
        if (RUIDO_DE_REDE.test(texto)) return
        erros.push(`consola @ ${page.url()} :: ${texto}`)
      })
      // Uma excepcao por apanhar e sempre da app, nunca da rede.
      page.on('pageerror', (e) => erros.push(`excepcao @ ${page.url()} :: ${e}`))

      await comTema(page, tema)
      for (const rota of ROTAS) {
        await page.goto(rota.caminho)
      }

      expect(erros, erros.join('\n')).toEqual([])
    })
  })
}

test.describe('larguras extremas', () => {
  // 360 e 430 px sao os outros dois valores que a definicao de pagina
  // concluida exige. Ficam num teste proprio em vez de num terceiro
  // projeto, para nao correr a suite inteira mais uma vez.
  for (const largura of [360, 430]) {
    test(`nada transborda a ${largura} px, no escuro`, async ({ page }) => {
      await comTema(page, 'escuro')
      await page.setViewportSize({ width: largura, height: 800 })

      for (const rota of ROTAS) {
        await page.goto(rota.caminho)
        expect(await excessoHorizontal(page), `${rota.caminho}`).toBe(0)
      }
    })
  }
})

test.describe('interruptor de tema', () => {
  // Sem `comTema` aqui, e de proposito: o `addInitScript` volta a correr a
  // CADA navegacao, incluindo o recarregar, e reescrevia a escolha que o
  // teste acabou de fazer — dava um teste que se auto-sabotava. Em vez
  // disso finge-se um sistema em claro e deixa-se a app decidir, que e o
  // que acontece a quem chega de novo.
  test.use({ colorScheme: 'light' })

  test('troca o tema e a escolha sobrevive a recarregar', async ({ page }) => {
    await page.goto('/')

    const interruptor = page.getByRole('switch', { name: 'Tema escuro' })
    await expect(interruptor).toHaveAttribute('aria-checked', 'false')

    await interruptor.click()
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro')
    await expect(page.getByRole('switch', { name: 'Tema escuro' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  test('só existe na porta de entrada', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('switch', { name: 'Tema escuro' })).toHaveCount(0)
  })
})

test.describe('assistente de pedir aula', () => {
  test('a idade é pedida antes das disciplinas', async ({ page }) => {
    await page.goto('/pedir-aula?programa=musica')
    await expect(page.getByRole('heading', { name: 'Que idade tem o futuro aluno?' })).toBeVisible()
  })

  test('com 4 anos não há nada em Música, e diz-se porquê', async ({ page }) => {
    await page.goto('/pedir-aula?programa=musica&idade=4')

    // O beco tem de continuar a explicar-se: as disciplinas ficam a vista,
    // recuadas, com o motivo escrito. Escondê-las seria nao dizer nada.
    await expect(page.getByText(/ainda não há nada em Música/i)).toBeVisible()
    const foraDeIdade = page.locator('.pinterest-pedido-opcao[aria-disabled="true"]')
    expect(await foraDeIdade.count()).toBeGreaterThan(0)
    await expect(foraDeIdade.first()).toContainText('Fora da faixa etária')
  })
})

test.describe('recuperação de password', () => {
  // Sem sessao nem pedido, a pagina da password nova nao tem nada que
  // fazer — e o reencaminhamento e a unica parte deste percurso que se
  // pode provar sem um codigo real.
  test('a página da password nova reencaminha quem lá chega sem pedido', async ({ page }) => {
    await page.goto('/redefinir-password')
    await expect(page).toHaveURL(/\/esqueci-password/)
  })

  test('um link gasto explica-se e não atira para o login', async ({ page }) => {
    await page.goto('/auth/confirm?token_hash=invalido&type=recovery')
    await expect(page).toHaveURL(/\/esqueci-password/)
    await expect(page.getByText(/O link expirou ou já tinha sido usado/)).toBeVisible()
  })

  // Isto so garante que o caminho de ERRO nao sai do dominio. A
  // verificacao do `next` em si esta em
  // `src/lib/auth/destino-seguro.test.ts`: aqui nunca chega a ser usada,
  // porque um codigo invalido nao passa da validacao — e um codigo valido
  // depende de haver email a sair.
  test('o caminho de erro não sai da aplicação', async ({ page }, info) => {
    const esperado = new URL(info.project.use.baseURL as string).host
    await page.goto('/auth/confirm?code=invalido&next=//exemplo-externo.invalid')
    expect(new URL(page.url()).host).toBe(esperado)
  })
})

test('uma morada que não existe explica-se em vez de rebentar', async ({ page }) => {
  await page.goto('/rota-que-nao-existe')
  await expect(page.getByRole('heading', { name: /Isto não existe/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar ao início' })).toBeVisible()
})
