import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const isLoggingOut = React.useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);

  const handleLogout = async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    try { await logoutUser(); } catch { }
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
    <div className="layout">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        style={{
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? (sidebarOpen ? '0' : '-260px') : '0',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1050,
          boxShadow: isMobile && sidebarOpen ? '5px 0 30px rgba(0,0,0,0.5)' : 'none'
        }}
      >
        <div className="sidebar-brand">
          <div className="brand-text d-flex align-items-center gap-2">
            <span className="brand-icon">👑</span> Mans Luxury
          </div>
          {isMobile && (
            <button className="mobile-close" onClick={() => setSidebarOpen(false)}>✕</button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        
        {/* Topbar */}
        <header className="topbar">
          <div className="d-flex align-items-center gap-3">
            {isMobile && (
              <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
                ☰
              </button>
            )}
            <h5 className="topbar-title m-0 d-none d-sm-block">Mans Luxury Empire</h5>
          </div>
          
          <div className="topbar-right">
            <button className="btn-primary btn-sm cart-btn" onClick={() => setIsCartOpen(true)}>
              🛒 <span className="cart-text">Cart</span>
              {cartCount > 0 && (
                <span className="badge rounded-pill bg-danger ms-1" style={{ fontSize: '10px' }}>
                  {cartCount}
                </span>
              )}
            </button>

            <div className="user-info">
              <div className="user-avatar shadow-sm">
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="user-details user-details-desktop">
                <span className="user-name">{user?.full_name}</span>
                <span className="user-role-badge">
                  {roleLabel[user?.role ?? ''] ?? user?.role}
                </span>
              </div>
            </div>

            <button className="btn-logout" onClick={handleLogout} title="Logout">
              <span className="logout-text">Logout</span>
              <span className="logout-icon text-danger">🚪</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          <Outlet />
        </main>
        
        <CartDrawer />
      </div>
    </div>
  );
};

export default Layout;

