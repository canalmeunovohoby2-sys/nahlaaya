import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AdminAuthProvider } from './admin/AdminAuthContext'
import { AdminGuard } from './admin/AdminGuard'
import { AdminLayout } from './components/admin/AdminLayout'
import { StoreLayout } from './components/layout/StoreLayout'
import { CartProvider } from './context/CartProvider'
import { CatalogProvider } from './context/CatalogProvider'
import { AdminCustomersPage } from './pages/AdminCustomersPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminOrdersPage } from './pages/AdminOrdersPage'
import { AdminProductsPage } from './pages/AdminProductsPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ExchangesPage } from './pages/ExchangesPage'
import { FemininosPage } from './pages/FemininosPage'
import { HomePage } from './pages/HomePage'
import { MarcasPage } from './pages/MarcasPage'
import { MasculinosPage } from './pages/MasculinosPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OfertasPage } from './pages/OfertasPage'
import { PerfumesPage } from './pages/PerfumesPage'
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage'
import { ProductPage } from './pages/ProductPage'
import { ShippingPage } from './pages/ShippingPage'
import { TermsPage } from './pages/TermsPage'

function App() {
  return (
    <BrowserRouter>
      <CatalogProvider>
        <CartProvider>
        <AdminAuthProvider>
          <Routes>
            <Route path="admin/login" element={<AdminLoginPage />} />
            <Route
              path="admin"
              element={
                <AdminGuard>
                  <AdminLayout />
                </AdminGuard>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="produtos" element={<AdminProductsPage />} />
              <Route path="pedidos" element={<AdminOrdersPage />} />
              <Route path="clientes" element={<AdminCustomersPage />} />
            </Route>

            <Route element={<StoreLayout />}>
              <Route index element={<HomePage />} />
              <Route path="perfumes" element={<PerfumesPage />} />
              <Route path="femininos" element={<FemininosPage />} />
              <Route path="masculinos" element={<MasculinosPage />} />
              <Route path="marcas" element={<MarcasPage />} />
              <Route path="ofertas" element={<OfertasPage />} />
              <Route path="produto/:slug" element={<ProductPage />} />
              <Route path="carrinho" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="politica-de-privacidade" element={<PrivacyPolicyPage />} />
              <Route path="trocas-e-devolucoes" element={<ExchangesPage />} />
              <Route path="politica-de-entrega" element={<ShippingPage />} />
              <Route path="termos-e-condicoes" element={<TermsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AdminAuthProvider>
        </CartProvider>
      </CatalogProvider>
    </BrowserRouter>
  )
}

export default App
