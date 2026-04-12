import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProducts, getCategories, getOrders, getUsers } from '../services/api';
import { Link } from 'react-router-dom';

interface Stats { products: number; categories: number; orders: number; users: number }
interface Product { id: number; name: string; stock_quantity: number; sku: string }
interface Order { id: number; customer_name: string; total_amount: number; status: string; created_at: string }

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', hr: 'HR', super_head: 'Super Head', normal_staff: 'Staff',
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ products: 0, categories: 0, orders: 0, users: 0 });
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [p, c, o] = await Promise.all([getProducts(), getCategories(), getOrders()]);
        
        let userCount = 0;
        if (user?.role === 'super_admin' || user?.role === 'admin') {
          const u = await getUsers();
          userCount = u.data.length;
        }

        setStats({ products: p.data.length, categories: c.data.length, orders: o.data.length, users: userCount });
        
        // Filter low stock (< 10)
        setLowStock(p.data.filter((prod: Product) => prod.stock_quantity < 10).slice(0, 5));
        
        // Recent 5 orders
        const sortedOrders = [...o.data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentOrders(sortedOrders.slice(0, 5));

      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  const cards = [
    { label: 'Products', value: stats.products, icon: '📦', color: 'card-blue', path: '/products' },
    { label: 'Categories', value: stats.categories, icon: '🏷️', color: 'card-purple', path: '/categories' },
    { label: 'Orders', value: stats.orders, icon: '🛒', color: 'card-green', path: '/orders' },
    ...(user?.role === 'super_admin' || user?.role === 'admin'
      ? [{ label: 'Users', value: stats.users, icon: '👥', color: 'card-gold', path: '/users' }]
      : []),
  ];

  return (
    <div className="page-wrapper dashboard-summary">
      <div className="page-header d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
        <div>
          <h1 className="page-title">Welcome back, {user?.full_name} 👑</h1>
          <p className="page-subtitle">
            You are signed in as <span className="role-pill">{roleLabel[user?.role ?? ''] ?? user?.role}</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="stats-grid mt-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="stat-card skeleton" />)}
        </div>
      ) : (
        <>
          <div className="stats-grid mt-4">
            {cards.map((card) => (
              <Link key={card.label} to={card.path} className={`stat-card ${card.color}`}> 
                <div className="stat-icon">{card.icon}</div>
                <div className="stat-info">
                  <span className="stat-value">{card.value}</span>
                  <span className="stat-label">{card.label}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="row g-4 mt-2">
            {/* Low Stock Section */}
            <div className="col-12 col-xl-6">
              <div className="info-card h-100 w-100" style={{ maxWidth: 'none' }}>
                <h3 className="d-flex align-items-center gap-2">
                  ⚠️ Low Stock Alerts
                </h3>
                {lowStock.length === 0 ? (
                  <p style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '10px' }}>All products are sufficiently stocked.</p>
                ) : (
                  <ul className="access-list" style={{ marginTop: '10px' }}>
                    {lowStock.map(p => (
                      <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <span className="text-truncate me-2" style={{ maxWidth: '60%' }}>{p.name} <code style={{ fontSize: '10px', color: 'var(--text3)' }}>({p.sku})</code></span>
                        <span className={`stock-badge ${p.stock_quantity < 5 ? 'low' : 'medium'}`} style={{ whiteSpace: 'nowrap' }}>{p.stock_quantity} left</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/products" className="link-accent d-inline-block mt-3" style={{ fontSize: '13px' }}>View Catalog →</Link>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="col-12 col-xl-6">
              <div className="info-card h-100 w-100" style={{ maxWidth: 'none' }}>
                <h3>🛒 Recent Orders</h3>
                {recentOrders.length === 0 ? (
                  <p style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '10px' }}>No orders placed today.</p>
                ) : (
                  <ul className="access-list" style={{ marginTop: '10px' }}>
                    {recentOrders.map(o => (
                      <li key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '60%' }}>
                          <span className="fw-bold text-white text-truncate">{o.customer_name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="price d-block">₦{o.total_amount.toLocaleString()}</span>
                          <span style={{ fontSize: '9px', textTransform: 'uppercase' }} className={`status-badge ${o.status === 'completed' ? 'status-completed' : 'status-pending'}`}>{o.status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/orders" className="link-accent d-inline-block mt-3" style={{ fontSize: '13px' }}>View All Orders →</Link>
              </div>
            </div>
          </div>

          <div className="dashboard-info" style={{ marginTop: '32px' }}>
            <div className="info-card w-100" style={{ maxWidth: 'none' }}>
              <h3>🔐 Access Control & Verification</h3>
              <ul className="access-list">
                <li>✅ Full Directory Access (Products, Categories, Orders)</li>
                {(user?.role === 'admin' || user?.role === 'super_admin') && <li>✅ Inventory Modification (Create/Edit Products)</li>}
                {(user?.role === 'admin' || user?.role === 'super_admin') && <li>✅ POS Order Pipeline Management</li>}
                {(user?.role === 'admin' || user?.role === 'super_admin') && <li>✅ Staff & Human Resource Management</li>}
                {user?.role === 'super_admin' && <li>✅ System Configuration & Security Roles</li>}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
