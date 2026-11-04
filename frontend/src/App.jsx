import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ToastProvider } from './context/ToastContext';
import { AdminOnly, GuestLayout, ScrollToTop, ShopLayout } from './layouts/Layouts';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AuthPage from './pages/AuthPage';
import CartPage from './pages/CartPage';
import CatalogPage from './pages/CatalogPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderEditPage from './pages/OrderEditPage';
import OrderPage from './pages/OrderPage';
import OrdersPage from './pages/OrdersPage';
import ProductPage from './pages/ProductPage';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <ConfirmProvider>
              <ScrollToTop />
              <Routes>
                <Route element={<GuestLayout />}>
                  <Route path="/login" element={<AuthPage mode="login" />} />
                  <Route path="/cadastro" element={<AuthPage mode="cadastro" />} />
                </Route>
                <Route element={<ShopLayout />}>
                  <Route index element={<CatalogPage />} />
                  <Route path="/produto/:id" element={<ProductPage />} />
                  <Route path="/carrinho" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/pedidos" element={<OrdersPage />} />
                  <Route path="/pedido/:id" element={<OrderPage />} />
                  <Route path="/pedido/:id/editar" element={<OrderEditPage />} />
                  <Route element={<AdminOnly />}>
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<Navigate to="produtos" replace />} />
                      <Route path="produtos" element={<AdminProductsPage />} />
                      <Route path="pedidos" element={<AdminOrdersPage />} />
                      <Route path="cupons" element={<AdminCouponsPage />} />
                      <Route path="relatorios" element={<AdminReportsPage />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ConfirmProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </HashRouter>
  );
}
