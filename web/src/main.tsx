import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { renovarSessao } from '@/api/auth'
import { queryKeys } from '@/api/queryKeys'
import { criarQueryClient, Provedores } from '@/app/Provedores'
import { mocksAtivos } from '@/mocks/demo'
import { preCarregar } from '@/rotas'
import App from './App'
import './styles/app.css'

// Começa a baixar o layout e a tela da URL atual antes de qualquer outra coisa.
preCarregar(window.location.pathname)

/** Sem backend (desenvolvimento ou build de demonstração), liga a API simulada do MSW. */
async function iniciarMocks() {
  if (!mocksAtivos) return
  const { ligarMocks } = await import('./mocks/browser')
  ligarMocks()
}

// O site abre mesmo se a API simulada falhar (o erro fica no console).
iniciarMocks()
  .catch((erro: unknown) => console.error('Não foi possível ligar a API simulada:', erro))
  .then(() => {
  const queryClient = criarQueryClient()
  // Restaura a sessão em paralelo ao download das telas, sem esperar o React montar.
  void queryClient.prefetchQuery({ queryKey: queryKeys.sessao, queryFn: renovarSessao, staleTime: Infinity })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provedores queryClient={queryClient}>
        {/* Sem transições: ao sair, a troca de página acontece antes de a sessão ser limpa (STY009 passo 5). */}
        <BrowserRouter useTransitions={false}>
          <App />
        </BrowserRouter>
      </Provedores>
    </StrictMode>,
  )
})
