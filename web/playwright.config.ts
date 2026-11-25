import { defineConfig } from '@playwright/test'

const PORTA = 5179
const noCI = Boolean(process.env.CI)

/**
 * Testes ponta a ponta (ADR-17) em 360 px e 1440 px (ADR-20), sobre o build de produção com a
 * API simulada (npm run build:demo). Localmente roda no Microsoft Edge já instalado no Windows;
 * no CI, no Chromium do Playwright.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // Poucos navegadores ao mesmo tempo e uma nova tentativa: evita falhas por máquina sobrecarregada.
  workers: 3,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORTA}`,
    channel: noCI ? undefined : 'msedge',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'celular-360', use: { viewport: { width: 360, height: 780 } } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx vite build --mode demo --logLevel warn && npx vite preview --port ${PORTA} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORTA}`,
    reuseExistingServer: !noCI,
    timeout: 60_000,
  },
})
