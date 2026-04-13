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

  const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="nav flex-column gap-1">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            `nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-white ${
              isActive ? 'bg-primary fw-bold shadow-sm' : 'opacity-75'
            }`
          }
          style={{ transition: 'all 0.2s ease' }}
        >
          <span className="fs-5">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="vh-100 d-flex flex-column overflow-hidden bg-dark">

      {/* ========== TOP NAVBAR ========== */}
      <Navbar bg="black" variant="dark" className="border-bottom border-secondary px-2 px-md-3 flex-shrink-0" style={{ height: '64px', zIndex: 1060 }}>
        <Container fluid className="p-0">

          {/* Left: Hamburger + Brand */}
          <div className="d-flex align-items-center gap-2">
            {/* Hamburger button — visible only below lg */}
            <Navbar.Toggle
              aria-controls="sidebarOffcanvas"
              className="d-lg-none border-0 p-1"
              onClick={handleShowSidebar}
            />
            <Link to="/dashboard" className="navbar-brand fw-bold m-0 d-flex align-items-center gap-2">
              <span className="fs-4">👑</span>
              <span
                className="d-none d-sm-inline fw-bold"
                style={{
                  background: 'linear-gradient(135deg, #d4a843, #f0c96a)',
                  WebkitBackgroundClip: 'text',
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
              className="btn btn-warning btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1 border-0 shadow-sm"
              onClick={() => setIsCartOpen(true)}
            >
              🛒 <span className="d-none d-md-inline">Cart</span>
              {cartCount > 0 && (
                <span className="badge bg-danger rounded-pill ms-1">{cartCount}</span>
              )}
            </button>

            {/* User Avatar + Info */}
            <div className="d-flex align-items-center gap-2 border-start border-secondary ps-2 ps-md-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm text-white"
                style={{
                  width: '36px',
                  height: '36px',
                  fontSize: '14px',
                  background: 'linear-gradient(135deg, #1d1e22, #343a40)',
                }}
              >
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div className="d-none d-lg-flex flex-column lh-1">
                <span className="fw-bold text-white small">{user?.full_name}</span>
                <span
                  className="text-warning mt-1"
                  style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {roleLabel[user?.role ?? ''] ?? user?.role}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center border-0"
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
          className="d-none d-lg-flex flex-column bg-black border-end border-secondary p-3 overflow-auto"
          style={{ width: '260px', flexShrink: 0 }}
        >
          <SidebarNav />
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
