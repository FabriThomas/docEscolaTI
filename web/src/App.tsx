import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { RotaProtegida } from '@/components/layout/RotaProtegida'
import { Avisos } from '@/components/ui/Avisos'
import { Carregando } from '@/components/ui/Spinner'
import { carregar } from '@/rotas'

// Layouts e telas viram arquivos separados no build: a primeira visita baixa só o necessário (ADR-20).
const AppShell = lazy(() => carregar.AppShell().then((m) => ({ default: m.AppShell })))
const AuthLayout = lazy(() => carregar.AuthLayout().then((m) => ({ default: m.AuthLayout })))
const InicioPage = lazy(() => carregar.paginas().then((m) => ({ default: m.InicioPage })))
const EmBrevePage = lazy(() => carregar.paginas().then((m) => ({ default: m.EmBrevePage })))
const NaoEncontradaPage = lazy(() => carregar.paginas().then((m) => ({ default: m.NaoEncontradaPage })))
const EntrarPage = lazy(carregar.EntrarPage)
const CriarContaPage = lazy(carregar.CriarContaPage)
const VerificarEmailPage = lazy(carregar.VerificarEmailPage)
const RecuperarSenhaPage = lazy(carregar.RecuperarSenhaPage)
const RedefinirSenhaPage = lazy(carregar.RedefinirSenhaPage)
const EntrarComCodigoPage = lazy(carregar.EntrarComCodigoPage)
const PerfilPage = lazy(carregar.PerfilPage)
const EditarPerfilPage = lazy(carregar.EditarPerfilPage)
const SegurancaPage = lazy(carregar.SegurancaPage)
const ExcluirContaPage = lazy(carregar.ExcluirContaPage)
const SobrePage = lazy(carregar.SobrePage)
const TermosPage = lazy(carregar.TermosPage)
const PrivacidadePage = lazy(carregar.PrivacidadePage)
const AjudaPage = lazy(carregar.AjudaPage)
const BuscarPage = lazy(carregar.BuscarPage)
const AnuncioPage = lazy(carregar.AnuncioPage)
const AnunciarPage = lazy(carregar.AnunciarPage)
const FavoritosPage = lazy(() => carregar.ListasPages().then((m) => ({ default: m.FavoritosPage })))
const CompararPage = lazy(() => carregar.ListasPages().then((m) => ({ default: m.CompararPage })))
const MeusAnunciosPage = lazy(() => carregar.ListasPages().then((m) => ({ default: m.MeusAnunciosPage })))

export default function App() {
  return (
    <>
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="entrar" element={<EntrarPage />} />
            <Route path="criar-conta" element={<CriarContaPage />} />
            <Route path="verificar-email" element={<VerificarEmailPage />} />
            <Route path="recuperar-senha" element={<RecuperarSenhaPage />} />
            <Route path="redefinir-senha" element={<RedefinirSenhaPage />} />
            <Route path="entrar-com-codigo" element={<EntrarComCodigoPage />} />
          </Route>

          <Route element={<AppShell />}>
            <Route index element={<InicioPage />} />
            <Route path="sobre" element={<SobrePage />} />
            <Route path="termos" element={<TermosPage />} />
            <Route path="privacidade" element={<PrivacidadePage />} />
            <Route path="ajuda" element={<AjudaPage />} />
            <Route path="buscar" element={<BuscarPage />} />
            <Route path="anuncios/:id" element={<AnuncioPage />} />
            <Route path="comparar" element={<CompararPage />} />
            <Route path="chat" element={<EmBrevePage titulo="Chat" />} />

            <Route element={<RotaProtegida />}>
              <Route path="perfil" element={<PerfilPage />} />
              <Route path="perfil/editar" element={<EditarPerfilPage />} />
              <Route path="seguranca" element={<SegurancaPage />} />
              <Route path="conta/excluir" element={<ExcluirContaPage />} />
              <Route path="anunciar" element={<AnunciarPage />} />
              <Route path="anuncios" element={<MeusAnunciosPage />} />
              <Route path="favoritos" element={<FavoritosPage />} />
              <Route path="carteira" element={<EmBrevePage titulo="Carteira" />} />
              <Route path="impacto-esg" element={<EmBrevePage titulo="Meu impacto ESG" />} />
            </Route>

            <Route path="*" element={<NaoEncontradaPage />} />
          </Route>
        </Routes>
      </Suspense>
      <Avisos />
    </>
  )
}
