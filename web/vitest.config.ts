import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Testes de unidade, componente e acessibilidade (ADR-17): Vitest + Testing Library + axe.
export default defineConfig((ambiente) =>
  mergeConfig(viteConfig(ambiente), {
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.tsx'],
      include: ['src/**/*.test.{ts,tsx}', '../packages/schemas/src/**/*.test.ts'],
      css: false,
      testTimeout: 15_000,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/mocks/**', 'src/test/**', 'src/main.tsx', 'src/**/*.test.{ts,tsx}', 'src/vite-env.d.ts'],
        reporter: ['text-summary', 'html'],
        thresholds: { lines: 60 },
      },
    },
  }),
)
