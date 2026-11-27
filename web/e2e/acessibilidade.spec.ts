import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { BRUNO, entrar } from './ajudantes.ts'

/**
 * ADR-20: axe sem violações críticas ou sérias (com contraste calculado pelo navegador)
 * e sem rolagem horizontal, em 360 px e 1440 px.
 */
async function auditar(page: import('@playwright/test').Page) {
  // O Turnstile mantém a rede ativa: espera só o carregamento da página.
  await page.waitForLoadState('load')
  const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('iframe').analyze()
  const graves = resultado.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])

  const rolagem = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(rolagem, 'rolagem horizontal').toBeLessThanOrEqual(0)
}

const publicas = [
  ['/', 'Conectando hardware com propósito.'],
  ['/entrar', 'Acesse sua conta'],
  ['/criar-conta', 'Criar sua conta'],
  ['/recuperar-senha', 'Recuperar senha'],
  ['/entrar-com-codigo', 'Entrar com código'],
  ['/sobre', 'Sobre o Steely'],
  ['/termos', 'Termos de Uso'],
  ['/privacidade', 'Política de Privacidade'],
  ['/ajuda', 'Central de Ajuda'],
] as const

for (const [rota, titulo] of publicas) {
  test(`${rota} é acessível e cabe na tela`, async ({ page }) => {
    await page.goto(rota)
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
    await auditar(page)
  })
}

for (const [rota, titulo] of [
  ['/perfil', 'Perfil'],
  ['/perfil/editar', 'Editar perfil'],
  ['/seguranca', 'Segurança'],
  ['/conta/excluir', 'Excluir conta'],
] as const) {
  test(`${rota} (logado) é acessível e cabe na tela`, async ({ page }) => {
    await entrar(page, BRUNO)
    await page.goto(rota)
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
    await auditar(page)
  })
}
