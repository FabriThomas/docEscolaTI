/**
 * Carregadores das telas (cada um vira um arquivo no build). Ao abrir o site, `preCarregar`
 * baixa em paralelo o layout e a tela da URL atual, evitando a cascata layout → tela (LCP).
 */
export const carregar = {
  AppShell: () => import('@/components/layout/AppShell'),
  AuthLayout: () => import('@/components/layout/AuthLayout'),
  paginas: () => import('@/features/paginas'),
  EntrarPage: () => import('@/features/auth/EntrarPage'),
  CriarContaPage: () => import('@/features/auth/CriarContaPage'),
  VerificarEmailPage: () => import('@/features/auth/VerificarEmailPage'),
  RecuperarSenhaPage: () => import('@/features/auth/RecuperarSenhaPage'),
  RedefinirSenhaPage: () => import('@/features/auth/RedefinirSenhaPage'),
  EntrarComCodigoPage: () => import('@/features/auth/EntrarComCodigoPage'),
  PerfilPage: () => import('@/features/conta/PerfilPage'),
  EditarPerfilPage: () => import('@/features/conta/EditarPerfilPage'),
  SegurancaPage: () => import('@/features/conta/SegurancaPage'),
  ExcluirContaPage: () => import('@/features/conta/ExcluirContaPage'),
  SobrePage: () => import('@/features/institucional/SobrePage'),
  TermosPage: () => import('@/features/institucional/TermosPage'),
  PrivacidadePage: () => import('@/features/institucional/PrivacidadePage'),
  AjudaPage: () => import('@/features/institucional/AjudaPage'),
  BuscarPage: () => import('@/features/anuncios/BuscarPage'),
  AnuncioPage: () => import('@/features/anuncios/AnuncioPage'),
  AnunciarPage: () => import('@/features/anuncios/AnunciarPage'),
  ListasPages: () => import('@/features/anuncios/ListasPages'),
}

const telasAuth: Record<string, keyof typeof carregar> = {
  '/entrar': 'EntrarPage',
  '/criar-conta': 'CriarContaPage',
  '/verificar-email': 'VerificarEmailPage',
  '/recuperar-senha': 'RecuperarSenhaPage',
  '/redefinir-senha': 'RedefinirSenhaPage',
  '/entrar-com-codigo': 'EntrarComCodigoPage',
}

const telasApp: Record<string, keyof typeof carregar> = {
  '/': 'paginas',
  '/perfil': 'PerfilPage',
  '/perfil/editar': 'EditarPerfilPage',
  '/seguranca': 'SegurancaPage',
  '/conta/excluir': 'ExcluirContaPage',
  '/sobre': 'SobrePage',
  '/termos': 'TermosPage',
  '/privacidade': 'PrivacidadePage',
  '/ajuda': 'AjudaPage',
  '/buscar': 'BuscarPage',
  '/anunciar': 'AnunciarPage',
  '/anuncios': 'ListasPages',
  '/favoritos': 'ListasPages',
  '/comparar': 'ListasPages',
}

export function preCarregar(caminho: string) {
  const rota = caminho.replace(/\/+$/, '') || '/'
  const auth = telasAuth[rota]
  if (auth) {
    void carregar.AuthLayout()
    void carregar[auth]()
    return
  }
  void carregar.AppShell()
  void carregar[telasApp[rota] ?? (rota.startsWith('/anuncios/') ? 'AnuncioPage' : 'paginas')]()
}
