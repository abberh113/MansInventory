import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import OrdersPage from './pages/OrdersPage';
import UsersPage from './pages/UsersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ReceiptPage from './pages/ReceiptPage';
import ProductOrderPage from './pages/ProductOrderPage';
import './index.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected: any logged-in user */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/receipt/:orderId" element={<ReceiptPage />} />

              <Route path="/product_order" element={<ProductOrderPage />} />

              {/* Admin + Super Admin + HR only */}
              <Route element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'hr']} />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
