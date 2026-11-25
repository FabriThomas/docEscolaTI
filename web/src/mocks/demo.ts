import rotasBackend from '@/api/rotas-backend.json'

/** Dados de demonstração da API simulada (todos inventados; o repositório é público). */
export const DEMO = {
  codigo: '123456',
  senha: 'Steely@2026',
  contas: [
    { email: 'ana.pereira@exemplo.com', descricao: 'com verificação em duas etapas e 340 moedas' },
    { email: 'bruno.lima@exemplo.com', descricao: 'sem verificação em duas etapas e sem saldo' },
  ],
  tokenRedefinicao: 'demo',
} as const

/**
 * Modos da API no navegador (VITE_API_MOCK):
 * - "tudo" (ou "true"): tudo simulado. Padrão em desenvolvimento sem VITE_API_URL nem proxy.
 * - "parcial": rotas que o FastAPI já tem (src/api/rotas-backend.json) vão para o servidor real;
 *   o resto é simulado. Use com `npm run dev:hibrido`.
 * - "nao": tudo vai para o servidor real.
 */
const modo = import.meta.env.VITE_API_MOCK
const semServidor = !import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_PROXY

export const mocksParciais = modo === 'parcial'
export const mocksAtivos = modo === 'tudo' || modo === 'true' || mocksParciais || (import.meta.env.DEV && semServidor && modo !== 'nao')

/** Rotas atendidas pelo FastAPI de verdade quando o modo é parcial. */
export const ROTAS_DO_BACKEND: readonly string[] = rotasBackend.rotas.map((r) => `/api/v1${r}`)

/** Segredo de teste para assinar o JWT simulado (o mesmo SUPABASE_JWT_SECRET do .env do backend local). */
export const SEGREDO_JWT_DEV = import.meta.env.VITE_DEV_JWT_SECRET ?? ''
