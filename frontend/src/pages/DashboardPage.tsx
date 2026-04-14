import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProducts, getCategories, getOrders, getUsers } from '../services/api';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, ListGroup, Placeholder } from 'react-bootstrap';

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
        setLowStock(p.data.filter((prod: Product) => prod.stock_quantity < 10).slice(0, 5));
        const sortedOrders = [...o.data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentOrders(sortedOrders.slice(0, 5));

      } catch { /* silently fail */ } finally { setLoading(false); }
    };
    fetchDashboardData();
  }, [user]);

  const statCards = [
    { label: 'Products', value: stats.products, icon: '📦', color: 'card-blue', path: '/products', trend: '+12%', variant: 'primary' },
    { label: 'Categories', value: stats.categories, icon: '🏷️', color: 'card-purple', path: '/categories', trend: '+2', variant: 'info' },
    { label: 'Orders', value: stats.orders, icon: '🛒', color: 'card-green', path: '/orders', trend: '+24', variant: 'success' },
    ...(user?.role === 'super_admin' || user?.role === 'admin'
      ? [{ label: 'Users', value: stats.users, icon: '👥', color: 'card-gold', path: '/users', trend: '+3', variant: 'warning' }]
      : []),
  ];

  return (
    <Container fluid className="page-wrapper dashboard-summary animate-fade-in-up">
      <header className="page-header py-4">
        <Row className="align-items-center">
          <Col xs="auto">
            <div className="header-icon-box fs-1">👑</div>
          </Col>
          <Col>
            <h1 className="page-title fw-bold mb-1" style={{ fontSize: '2.5rem' }}>
              Welcome, {user?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-muted mb-0">
              Operational Command Center <Badge bg="warning" text="dark" className="ms-2 rounded-pill shadow-sm">{roleLabel[user?.role ?? ''] ?? user?.role}</Badge>
            </p>
          </Col>
        </Row>
      </header>

      {loading ? (
        <Row className="g-4 mt-2">
          {[1, 2, 3, 4].map(i => (
            <Col key={i} xs={12} sm={6} lg={3}>
              <Card className="stat-card skeleton border-0 shadow-sm" style={{ height: '140px' }} />
            </Col>
          ))}
        </Row>
      ) : (
        <div className="animate-fade-in-up delay-100">
          <Row className="g-4 mt-2">
            {statCards.map((card, idx) => (
              <Col key={card.label} xs={12} sm={6} lg={3} className="animate-fade-in-scale" style={{ animationDelay: `${idx * 0.1}s` }}>
                <Link to={card.path} className="text-decoration-none">
                  <Card className={`stat-card h-100 ${card.color} border-0`}>
                    <Card.Body className="d-flex align-items-center gap-4">
                      <div className="stat-icon-wrapper rounded-4 shadow-sm">{card.icon}</div>
                      <div>
                        <div className="d-flex align-items-baseline gap-2">
                          <h2 className="stat-value mb-0 fw-800">{card.value}</h2>
                          <Badge bg="white" text="success" className="bg-opacity-10 x-small px-2 py-1">{card.trend}</Badge>
                        </div>
                        <Card.Text className="stat-label mb-0 text-uppercase tracking-wider">{card.label}</Card.Text>
                      </div>
                    </Card.Body>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>

          <Row className="g-4 mt-4 animate-fade-in-up delay-400">
            {/* Low Stock Alerts */}
            <Col xs={12} xl={7}>
              <Card className="info-card h-100 border-0 shadow-lg overflow-hidden">
                <Card.Header className="bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <h3 className="m-0 fw-bold d-flex align-items-center gap-2">
                    <span className="text-danger">⚠️</span> Low Stock Alerts
                  </h3>
                  <Link to="/products" className="btn btn-link link-accent p-0 text-decoration-none x-small fw-bold">REFINE CATALOG</Link>
                </Card.Header>
                <Card.Body className="px-4 pb-4">
                  {lowStock.length === 0 ? (
                    <div className="text-center py-5 opacity-50">
                      <div className="fs-1">✅</div>
                      <p>All stock levels healthy.</p>
                    </div>
                  ) : (
                    <ListGroup variant="flush" className="summary-list bg-transparent">
                      {lowStock.map(p => (
                        <ListGroup.Item key={p.id} className="bg-transparent border-light border-opacity-10 py-3 px-0 d-flex justify-content-between align-items-center hover-bg-light transition-all">
                          <div className="d-flex align-items-center gap-3">
                            <Badge bg="danger" className="bg-opacity-10 text-danger rounded-pill x-small">LOW</Badge>
                            <div className="d-flex flex-column">
                              <span className="text-white fw-bold">{p.name}</span>
                              <span className="x-small text-muted font-monospace">{p.sku}</span>
                            </div>
                          </div>
                          <Badge bg="dark" pill className="border border-secondary px-3 py-2 fw-bold">{p.stock_quantity} Left</Badge>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Recent Orders */}
            <Col xs={12} xl={5}>
              <Card className="info-card h-100 border-0 shadow-lg overflow-hidden">
                <Card.Header className="bg-transparent border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <h3 className="m-0 fw-bold d-flex align-items-center gap-2">
                    <span>🛒</span> Recent Orders
                  </h3>
                  <Link to="/orders" className="btn btn-link link-accent p-0 text-decoration-none x-small fw-bold">VIEW HISTORY</Link>
                </Card.Header>
                <Card.Body className="px-4 pb-4">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-5 opacity-50"><p>No transactions found.</p></div>
                  ) : (
                    <ListGroup variant="flush" className="summary-list bg-transparent">
                      {recentOrders.map(o => (
                        <ListGroup.Item key={o.id} className="bg-transparent border-light border-opacity-10 py-3 px-0 d-flex justify-content-between align-items-center hover-bg-light transition-all">
                          <div>
                            <div className="text-white fw-bold">{o.customer_name}</div>
                            <div className="x-small text-muted">{new Date(o.created_at).toLocaleDateString()}</div>
                          </div>
                          <div className="text-end">
                            <div className="price text-success fw-bold">₦{o.total_amount.toLocaleString()}</div>
                            <Badge className={`status-badge ${o.status === 'completed' ? 'status-completed' : 'status-pending'} x-small border-0`}>
                              {o.status}
                            </Badge>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mt-5 animate-fade-in-up delay-600 mb-5">
            <Col xs={12}>
              <Card className="info-card border-0 shadow-lg bg-dark">
                <Card.Body className="p-4 p-md-5">
                  <Card.Title className="fw-bold mb-4 d-flex align-items-center gap-2">
                    <span>🔐</span> Security & Access Profile
                  </Card.Title>
                  <Row className="g-4">
                    <Col md={6}>
                      <div className="p-3 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5 h-100">
                        <h6 className="text-warning x-small text-uppercase fw-bold mb-3">Live Permissions</h6>
                        <ListGroup variant="flush" className="bg-transparent">
                          <ListGroup.Item className="bg-transparent border-0 p-0 mb-2 x-small text-muted">✅ Secure Vault Access</ListGroup.Item>
                          <ListGroup.Item className="bg-transparent border-0 p-0 x-small text-muted">✅ Multi-Node Directory Access</ListGroup.Item>
                        </ListGroup>
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="p-3 rounded-4 bg-white bg-opacity-5 border border-white border-opacity-5 h-100">
                        <h6 className="text-primary x-small text-uppercase fw-bold mb-3">System Health</h6>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <div className="rounded-circle bg-success shadow-sm" style={{ width: '8px', height: '8px' }}></div>
                          <span className="x-small text-muted">Authentication Layer: ACTIVE</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle bg-success shadow-sm" style={{ width: '8px', height: '8px' }}></div>
                          <span className="x-small text-muted">PostgreSQL Engine: STABLE</span>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </Container>
  );
};

export default DashboardPage;
