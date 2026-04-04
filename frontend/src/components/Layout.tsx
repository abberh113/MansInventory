import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';
import { logoutUser } from '../services/api';

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hr: 'HR',
  super_head: 'Super Head',
  normal_staff: 'Staff',
};

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isLoggingOut = React.useRef(false);

  const handleLogout = async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    try {
      await logoutUser();
    } catch {
      // Ignore logout log error
    }
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: '🏠', path: '/dashboard' },
    { label: 'Products', icon: '📦', path: '/products' },
    { label: 'Categories', icon: '🏷️', path: '/categories' },
    { label: 'Orders', icon: '🛒', path: '/orders' },
    ...(user?.role === 'super_admin' || user?.role === 'admin' ? [{ label: 'Product Orders', icon: '🛍️', path: '/product_order' }] : []),
    ...(user?.role === 'super_admin' || user?.role === 'admin' ? [{ label: 'Users', icon: '👥', path: '/users' }] : []),
    ...(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr' ? [{ label: 'Activity Logs', icon: '📊', path: '/audit-logs' }] : []),
  ];

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">👑</span>
          {sidebarOpen && <span className="brand-text">Mans Luxury</span>}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Main Content */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <h2 className="topbar-title">Mans Luxury Empire</h2>
          </div>
          <div className="topbar-right">
            <button className="btn-secondary" style={{ position: 'relative', paddingRight: '45px', height: '40px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsCartOpen(true)}>
              🛒 Cart
              {cartCount > 0 && <span style={{ position: 'absolute', right: '10px', background: 'var(--gold)', color: '#000', width: '22px', height: '22px', borderRadius: '50%', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{cartCount}</span>}
            </button>
            <div className="user-info">
              <div className="user-avatar">{user?.full_name?.[0]?.toUpperCase()}</div>
              {sidebarOpen && (
                <div className="user-details">
                  <span className="user-name">{user?.full_name}</span>
                  <span className="user-role-badge">{roleLabel[user?.role ?? ''] ?? user?.role}</span>
                </div>
              )}
            </div>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
        <CartDrawer />
      </div>
    </div>
  );
};

export default Layout;
