import { expect, test } from '@playwright/test'
import { ANA, BRUNO, CODIGO, SENHA, entrar } from './ajudantes.ts'

test('login com 2FA só com teclado (ADR-20)', async ({ page }) => {
  await page.goto('/entrar')
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible()

  // Do topo da página até o campo, só com Tab.
  const campo = page.getByLabel('E-mail ou CPF')
  for (let i = 0; i < 15 && !(await campo.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(campo).toBeFocused()
  await page.keyboard.type(ANA)
  await page.keyboard.press('Tab')
  await page.keyboard.type(SENHA)
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'Verificação em duas etapas' })).toBeVisible()
  await expect(page.getByLabel('Dígito 1 de 6')).toBeFocused()
  await page.keyboard.type(CODIGO)
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
  await expect(page).toHaveTitle('Meu perfil · Steely')
})

test('sessão continua depois de recarregar e termina ao sair', async ({ page }) => {
  await entrar(page, BRUNO)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()

  await page.getByRole('button', { name: /Menu da conta/ }).click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Conectando hardware com propósito.' })).toBeVisible()

  await page.goto('/perfil')
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible()
})
