import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import axe from 'axe-core'
import { expect } from 'vitest'
import App from '@/App'
import { criarQueryClient, Provedores } from '@/app/Provedores'
import { db } from '@/mocks/db'

/** Renderiza o app inteiro (rotas reais + API simulada) a partir de uma URL. */
export function renderizarApp(rota = '/') {
  const queryClient = criarQueryClient()
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } })
  const usuario = userEvent.setup()
  const resultado = render(
    <Provedores queryClient={queryClient}>
      <MemoryRouter initialEntries={[rota]} useTransitions={false}>
        <App />
      </MemoryRouter>
    </Provedores>,
  )
  return { ...resultado, usuario, queryClient }
}

/** Simula o cookie de renovação de uma sessão já aberta para a conta informada. */
export function logarComo(email: string) {
  const conta = db.usuarios.find((u) => u.email === email)
  if (!conta) throw new Error(`Conta de teste não encontrada: ${email}`)
  const id = `ses_teste_${conta.id}`
  conta.sessions.push({ id, device: 'Chrome no Windows', kind: 'desktop', location: 'Maringá, PR', lastActiveAt: new Date().toISOString() })
  db.cookieRenovacao = id
  return conta
}

/**
 * Verifica acessibilidade com axe-core (ADR-17 e ADR-20). O contraste de cores é garantido
 * nos tokens (packages/tokens/scripts/contraste.mjs), porque o jsdom não calcula estilos.
 */
export async function esperarSemViolacoes(elemento: Element = document.body) {
  const resultado = await axe.run(elemento, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  const graves = resultado.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  expect(graves.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)).toEqual([])
}
