import { expect, type Page } from '@playwright/test'

export const SENHA = 'Steely@2026'
export const CODIGO = '123456'
export const ANA = 'ana.pereira@exemplo.com'
export const BRUNO = 'bruno.lima@exemplo.com'

/** Entra pela tela de login real (com 2FA quando a conta exigir). */
export async function entrar(page: Page, email: string) {
  await page.goto('/entrar')
  await page.getByLabel('E-mail ou CPF').fill(email)
  await page.getByLabel('Senha', { exact: false }).first().fill(SENHA)
  await page.getByRole('button', { name: 'Entrar na plataforma' }).click()
  if (email === ANA) {
    await expect(page.getByRole('heading', { name: 'Verificação em duas etapas' })).toBeVisible()
    await page.getByLabel('Dígito 1 de 6').pressSequentially(CODIGO)
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
}
