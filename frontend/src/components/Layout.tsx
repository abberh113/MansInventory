import React from 'react';
import { NavLink, useNavigate, Outlet, Link } from 'react-router-dom';
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

  const isLoggingOut = React.useRef(false);

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
    <div className="vh-100 d-flex flex-column overflow-hidden bg-dark">
      
      {/* Bootstrap Navbar (Topbar) */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-black border-bottom border-secondary px-3" style={{ height: '70px', zIndex: 1060 }}>
        <div className="container-fluid p-0">
          <div className="d-flex align-items-center gap-3">
            {/* Native Bootstrap Trigger for Offcanvas */}
            <button 
              className="navbar-toggler d-block d-lg-none border-0 p-0 text-warning" 
              type="button" 
              data-bs-toggle="offcanvas" 
              data-bs-target="#sidebarOffcanvas"
              aria-controls="sidebarOffcanvas"
            >
              <span className="navbar-toggler-icon" style={{ width: '24px' }}></span>
            </button>
            <Link to="/dashboard" className="navbar-brand fw-bold m-0 d-flex align-items-center gap-2">
              <span className="fs-4">👑</span>
              <span className="d-none d-sm-inline" style={{ background: 'linear-gradient(135deg, #d4a843, #f0c96a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MANS LUXURY</span>
            </Link>
          </div>

          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button className="btn btn-warning btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-2 border-0 shadow-sm" onClick={() => setIsCartOpen(true)}>
              🛒 <span className="d-none d-md-inline">Cart</span>
              {cartCount > 0 && <span className="badge bg-danger rounded-pill">{cartCount}</span>}
            </button>

            <div className="d-flex align-items-center gap-2 border-start border-secondary ps-3">
              <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: '36px', height: '36px', fontSize: '14px', background: 'linear-gradient(135deg, #1d1e22, #343a40)', color: 'white' }}>
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="d-none d-lg-flex flex-column lh-1">
                <span className="fw-bold text-white small">{user?.full_name}</span>
                <span className="text-warning mt-1" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{roleLabel[user?.role ?? ''] ?? user?.role}</span>
              </div>
            </div>

            <button className="btn btn-outline-danger btn-sm rounded-circle p-2 border-0" onClick={handleLogout} title="Logout">
              🚪
            </button>
          </div>
        </div>
      </nav>

      <div className="d-flex flex-grow-1 overflow-hidden">
        
        {/* Desktop Sidebar (Permanent on large screens) */}
        <aside className="d-none d-lg-flex flex-column bg-black border-end border-secondary p-3 shadow-lg" style={{ width: '260px', zIndex: 1000 }}>
          <nav className="nav flex-column gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-white ${isActive ? 'bg-primary fw-bold shadow-sm' : 'opacity-75 hov-warning'}`}
                style={{ transition: '0.2s' }}
              >
                <span className="fs-5">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Standard Bootstrap Offcanvas Sidebar (Mobile/Tablet) */}
        <div 
          className="offcanvas offcanvas-start bg-black text-white p-0 border-end border-secondary" 
          tabIndex={-1} 
          id="sidebarOffcanvas" 
          aria-labelledby="sidebarOffcanvasLabel"
          style={{ width: '280px' }}
        >
          <div className="offcanvas-header border-bottom border-secondary bg-black">
            <h5 className="offcanvas-title fw-bold d-flex align-items-center gap-2" id="sidebarOffcanvasLabel">
              <span className="fs-4">👑</span> MANS LUXURY
            </h5>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
          </div>
          <div className="offcanvas-body p-3">
             <nav className="nav flex-column gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-white ${isActive ? 'bg-primary fw-bold' : 'opacity-75 hov-warning'}`}
                  data-bs-dismiss="offcanvas" // Closes sidebar on nav link click
                >
                  <span className="fs-5">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-grow-1 overflow-auto p-3 p-md-4" style={{ backgroundColor: '#0a0a0f' }}>
          <Outlet />
        </main>
      </div>

      <CartDrawer />
    </div>
  );
};

export default Layout;

