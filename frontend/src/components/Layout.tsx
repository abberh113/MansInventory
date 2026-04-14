import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';
import { logoutUser } from '../services/api';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';

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
  const [showSidebar, setShowSidebar] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isLoggingOut = React.useRef(false);

  const handleLogout = async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    try { await logoutUser(); } catch { }
    logout();
    navigate('/login');
  };

  const handleCloseSidebar = () => setShowSidebar(false);
  const handleShowSidebar = () => setShowSidebar(true);

  const navItems = [
    { label: 'Dashboard', icon: '🏠', path: '/dashboard' },
    { label: 'Products', icon: '📦', path: '/products' },
    { label: 'Categories', icon: '🏷️', path: '/categories' },
    { label: 'Orders', icon: '🛒', path: '/orders' },
    ...(user?.role === 'super_admin' || user?.role === 'admin' ? [{ label: 'Product Orders', icon: '🛍️', path: '/product_order' }] : []),
    ...(user?.role === 'super_admin' || user?.role === 'admin' ? [{ label: 'Users', icon: '👥', path: '/users' }] : []),
    ...(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr' ? [{ label: 'Activity Logs', icon: '📊', path: '/audit-logs' }] : []),
  ];

  const SidebarNav = ({ onNavigate, isMini }: { onNavigate?: () => void, isMini?: boolean }) => (
    <nav className="nav flex-column gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            `nav-link d-flex align-items-center ${isMini ? 'justify-content-center' : 'gap-3 px-3'} py-2 rounded-3 text-white ${
              isActive ? 'nav-link-active fw-bold' : 'opacity-75 hover-bg-light'
            }`
          }
          style={{ transition: 'all 0.2s ease', title: isMini ? item.label : '' } as any}
          title={isMini ? item.label : ''}
        >
          <span className="fs-5">{item.icon}</span>
          {!isMini && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="vh-100 d-flex flex-column overflow-hidden bg-dark">

      {/* ========== TOP NAVBAR ========== */}
      <Navbar variant="dark" className="px-2 px-md-3 flex-shrink-0" style={{ 
        height: '64px', 
        zIndex: 1060,
        background: 'rgba(5, 5, 5, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <Container fluid className="p-0">

          {/* Left: Hamburger + Brand */}
          <div className="d-flex align-items-center gap-2">
            {/* Hamburger button — visible only below lg */}
            <button
              className="btn btn-link text-white d-lg-none p-1 shadow-none border-0 opacity-75 hover-opacity-100"
              onClick={() => setShowSidebar(!showSidebar)}
              style={{ fontSize: '24px', width: '40px' }}
            >
              {showSidebar ? '✕' : '☰'}
            </button>
            <Link to="/dashboard" className="navbar-brand fw-bold m-0 d-flex align-items-center gap-2">
              <span className="fs-4 animate-fade-in-scale">👑</span>
              <span
                className="d-none d-sm-inline fw-bold"
                style={{
                  fontSize: '18px',
                  letterSpacing: '1px',
                  background: 'linear-gradient(135deg, #d4a843 0%, #f0c96a 50%, #d4a843 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                MANS LUXURY
              </span>
            </Link>
          </div>

          {/* Right: Cart + User + Logout */}
          <div className="d-flex align-items-center gap-2 gap-md-3">
            {/* Cart */}
            <button
              className="btn btn-warning btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1 border-0 shadow-sm transition-all hover-scale"
              onClick={() => setIsCartOpen(true)}
              style={{ background: 'var(--gold)', color: '#000' }}
            >
              🛒 <span className="d-none d-md-inline">Cart</span>
              {cartCount > 0 && (
                <span className="badge bg-danger rounded-pill ms-1 animate-pulse">{cartCount}</span>
              )}
            </button>

            {/* User Avatar + Info */}
            <div className="d-flex align-items-center gap-2 border-start border-white border-opacity-10 ps-2 ps-md-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm text-white"
                style={{
                  width: '36px',
                  height: '36px',
                  fontSize: '14px',
                  background: 'linear-gradient(135deg, #222, #000)',
                  border: '1px solid var(--glass-border)'
                }}
              >
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="d-none d-lg-flex flex-column lh-1">
                <span className="fw-bold text-white small">{user?.full_name}</span>
                <span
                  className="mt-1 x-small fw-bold text-warning opacity-75"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {roleLabel[user?.role ?? ''] ?? user?.role}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center border-0 opacity-50 hover-opacity-100 transition-all"
              style={{ width: '36px', height: '36px' }}
              onClick={handleLogout}
              title="Logout"
            >
              🚪
            </button>
          </div>
        </Container>
      </Navbar>

      {/* ========== BODY: SIDEBAR + MAIN ========== */}
      <div className="d-flex flex-grow-1 overflow-hidden">

        {/* Desktop Sidebar — always visible on lg+ */}
        <aside
          className="d-none d-lg-flex flex-column bg-black border-end border-secondary p-3 overflow-hidden"
          style={{ 
            width: isCollapsed ? '80px' : '260px', 
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            flexShrink: 0 
          }}
        >
          <div className="d-flex flex-column h-100">
            <SidebarNav isMini={isCollapsed} />
            
            <button
              className="mt-auto btn btn-outline-secondary btn-sm border-0 opacity-50"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? '→' : '← Collapse'}
            </button>
          </div>
        </aside>

        {/* Mobile Offcanvas Sidebar — react-bootstrap handles show/hide */}
        <Offcanvas
          show={showSidebar}
          onHide={handleCloseSidebar}
          placement="start"
          className="bg-black text-white border-end border-secondary"
          style={{ width: '280px' }}
        >
          <Offcanvas.Header closeButton closeVariant="white" className="border-bottom border-secondary">
            <Offcanvas.Title className="fw-bold d-flex align-items-center gap-2">
              <span className="fs-4">👑</span> MANS LUXURY
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-3">
            <SidebarNav onNavigate={handleCloseSidebar} />
          </Offcanvas.Body>
        </Offcanvas>

        {/* Main Content */}
        <main className="flex-grow-1 overflow-auto p-3 p-md-4" style={{ backgroundColor: '#0a0a0f' }}>
          <Outlet />
        </main>
      </div>

      <CartDrawer />
    </div>
  );
};

export default Layout;
