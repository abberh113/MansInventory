import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, updateOrderStatus, getProducts, createOrder } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface OrderItem { id: number; product_id: number; quantity: number; unit_price: number }
interface Order { id: number; customer_name: string; status: string; total_amount: number; staff_email: string; items: OrderItem[]; created_at: string; payment_mode: string }
interface Product { id: number; name: string; price: number; stock_quantity: number; sku: string }

const STATUS_OPTIONS = ['pending', 'processing', 'completed', 'cancelled'];

const statusColor: Record<string, string> = {
  pending: 'status-pending',
  processing: 'status-processing',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
};

const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'super_admin' || user?.role === 'admin';
  const canGenerateStatement = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr';
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStatus, setEditingStatus] = useState<{ id: number; status: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementStart, setStatementStart] = useState('');
  const [statementEnd, setStatementEnd] = useState('');
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State for new order
  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    payment_mode: 'Transfer',
    items: [{ product_id: 0, quantity: 1 }],
  });

  const fetchData = async () => {
    try {
      const [orderRes, productRes] = await Promise.all([getOrders(), getProducts()]);
      setOrders(orderRes.data);
      setProducts(productRes.data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const navigate = useNavigate();

  const handleStatusUpdate = async () => {
    if (!editingStatus) return;
    try {
      await updateOrderStatus(editingStatus.id, editingStatus.status);
      setEditingStatus(null);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Status update failed.');
    }
  };

  const handleAddItem = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { product_id: 0, quantity: 1 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    const items = [...newOrder.items];
    items.splice(index, 1);
    setNewOrder({ ...newOrder, items });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const items = [...newOrder.items];
    (items[index] as any)[field] = value;
    setNewOrder({ ...newOrder, items });
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrder.items.some(item => item.product_id === 0)) {
      setError('Please select a product for all items.');
      return;
    }
    try {
      const res = await createOrder(newOrder);
      const savedOrder = res.data;
      setShowCreateModal(false);
      setNewOrder({ customer_name: '', payment_mode: 'Transfer', items: [{ product_id: 0, quantity: 1 }] });
      
      // Redirect to Receipt Page
      navigate(`/receipt/${savedOrder.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Order creation failed.');
    }
  };

  // Computed filtered orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          `#ORD-${o.id}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === '' || o.status === selectedStatus;
    
    let matchesDate = true;
    const orderTime = new Date(o.created_at).getTime();
    if (startDate) {
      const start = new Date(startDate).getTime();
      if (orderTime < start) matchesDate = false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (orderTime > end.getTime()) matchesDate = false;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportToCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer', 'Staff Email', 'Total', 'Status', 'Item Count'];
    const rows = filteredOrders.map(o => [
      `#ORD-${o.id}`, new Date(o.created_at).toLocaleDateString(), o.customer_name, o.staff_email || 'System', o.total_amount, o.status, o.items.length
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printDailySummary = () => {
    const today = new Date().toDateString();
    
    // Filter orders belonging to the current user that were created today
    const myOrdersToday = orders.filter(o => {
      const orderDate = new Date(o.created_at).toDateString();
      const isToday = orderDate === today;
      const isMyOrder = o.staff_email === user?.email;
      return isToday && isMyOrder;
    });

    const totalStr = myOrdersToday.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString();

    const win = window.open('', '_blank');
    if(!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>Daily Sales Summary - ${today}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; }
            h1 { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; }
            .meta { text-align: center; margin-bottom: 40px; font-size: 16px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 14px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: 700; color: #000; }
            tr:nth-child(even) { background-color: #fafafa; }
            .total { text-align: right; font-size: 24px; font-weight: bold; margin-top: 30px; border-top: 2px solid #111; padding-top: 20px; }
            @media print {
              button { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1 style="color: #d4a843;">OF MANS EMPIRE</h1>
          <h2>Daily Sales Summary</h2>
          <div class="meta">
            <p><strong>Staff Member:</strong> ${user?.full_name} (${user?.email})</p>
            <p><strong>Date Generated:</strong> ${today}</p>
            <p><strong>Total Orders Handled:</strong> ${myOrdersToday.length}</p>
          </div>
          
          ${myOrdersToday.length === 0 ? '<p style="text-align:center; font-style: italic; margin-top: 50px;">No sales recorded by you today.</p>' : `
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Time recorded</th>
                <th>Customer Name</th>
                <th>Payment Mode</th>
                <th>Items</th>
                <th>Total (₦)</th>
              </tr>
            </thead>
            <tbody>
              ${myOrdersToday.map(o => `
                <tr>
                  <td><strong>#ORD-${o.id}</strong></td>
                  <td>${new Date(o.created_at).toLocaleTimeString()}</td>
                  <td>${o.customer_name}</td>
                  <td>${o.payment_mode || 'Transfer'}</td>
                  <td>${o.items.length} units</td>
                  <td>${o.total_amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            Grand Total: ₦${totalStr}
          </div>
          `}
          
          <div style="text-align: center; margin-top: 60px;">
            <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; background: #000; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;">🖨️ Print / Save as PDF</button>
          </div>
        </body>
      </html>
    `);
    
    win.document.close();
  };

  const generateStatement = (e: React.FormEvent) => {
    e.preventDefault();
    setShowStatementModal(false);

    // Filter orders explicitly by the statement dates
    let statementOrders = orders;
    if (statementStart) {
      const startMs = new Date(statementStart).getTime();
      statementOrders = statementOrders.filter(o => new Date(o.created_at).getTime() >= startMs);
    }
    if (statementEnd) {
      const endObj = new Date(statementEnd);
      endObj.setHours(23, 59, 59, 999);
      statementOrders = statementOrders.filter(o => new Date(o.created_at).getTime() <= endObj.getTime());
    }

    const totalStr = statementOrders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString();

    const win = window.open('', '_blank');
    if(!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>Sales Statement</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; }
            h1 { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; }
            .meta { text-align: center; margin-bottom: 40px; font-size: 16px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 14px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: 700; color: #000; }
            tr:nth-child(even) { background-color: #fafafa; }
            .total { text-align: right; font-size: 24px; font-weight: bold; margin-top: 30px; border-top: 2px solid #111; padding-top: 20px; }
            @media print {
              button { display: none !important; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1 style="color: #d4a843;">OF MANS EMPIRE</h1>
          <h2>Official Sales Statement</h2>
          <div class="meta">
            <p><strong>Generated By:</strong> ${user?.full_name} (${user?.email})</p>
            <p><strong>Reporting Period:</strong> ${statementStart ? new Date(statementStart).toLocaleDateString() : 'Beginning of Time'} &mdash; ${statementEnd ? new Date(statementEnd).toLocaleDateString() : 'Present Date'}</p>
            <p><strong>Total Orders Included:</strong> ${statementOrders.length}</p>
          </div>
          
          ${statementOrders.length === 0 ? '<p style="text-align:center; font-style: italic; margin-top: 50px;">No sales found for the selected period.</p>' : `
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Staff Email</th>
                <th>Payment Mode</th>
                <th>Total (₦)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${statementOrders.map(o => `
                <tr>
                  <td>${new Date(o.created_at).toLocaleDateString()}</td>
                  <td><strong>#ORD-${o.id}</strong></td>
                  <td>${o.customer_name}</td>
                  <td>${o.staff_email || 'System'}</td>
                  <td>${o.payment_mode || 'Transfer'}</td>
                  <td>${o.total_amount.toLocaleString()}</td>
                  <td>${o.status.toUpperCase()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            Grand Total: ₦${totalStr}
          </div>
          `}
          
          <div style="text-align: center; margin-top: 60px;">
            <button onclick="window.print()" style="padding: 12px 24px; font-size: 16px; background: #000; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold;">🖨️ Print / Save Statement as PDF</button>
          </div>
        </body>
      </html>
    `);
    
    win.document.close();
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">View and manage customer orders</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => {
              setStatementStart(startDate);
              setStatementEnd(endDate);
              setShowStatementModal(true);
            }}
            disabled={!canGenerateStatement}
            title={!canGenerateStatement ? "Only HR, Admin, and Super Admins can generate official statements" : "Generate Official Sales Statement"}
            style={{ opacity: canGenerateStatement ? 1 : 0.5, cursor: canGenerateStatement ? 'pointer' : 'not-allowed' }}
          >
            📄 Generate Statement
          </button>
          <button className="btn-secondary" onClick={printDailySummary}>🖨️ Daily Summary</button>
          <button className="btn-secondary" onClick={exportToCSV}>📤 Export CSV</button>
          <button className="btn-primary" onClick={() => navigate('/products')}>+ New Order</button>
        </div>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: 'var(--surface)', padding: '15px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 2, minWidth: '200px', marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'bold' }}>SEARCH</label>
          <input 
            type="text" 
            placeholder="Search by customer or order ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'bold' }}>START DATE</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'bold' }}>END DATE</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
          <label style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'bold' }}>STATUS</label>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="loading-text">Loading orders...</div> : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th><th>Date</th><th>Customer</th><th>Initiated By</th><th>Total</th><th>Status</th><th>Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="empty-state">No orders found matching your criteria.</td></tr>
              ) : (
                <>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td><strong>#ORD-{order.id}</strong></td>
                      <td>{new Date(order.created_at).toLocaleDateString()}</td>
                      <td>{order.customer_name}</td>
                      <td className="small text-secondary">{order.staff_email || 'System'}</td>
                      <td className="price">₦{order.total_amount?.toLocaleString()}</td>
                      <td>
                        {editingStatus?.id === order.id ? (
                          <select
                            value={editingStatus.status}
                            onChange={(e) => setEditingStatus({ ...editingStatus, status: e.target.value })}
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={`status-badge ${statusColor[order.status] ?? ''}`}>{order.status}</span>
                        )}
                      </td>
                      <td>
                        {order.items?.length ?? 0}
                      </td>
                      <td className="action-cell">
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--accent)', color: 'white', marginRight: '5px' }} onClick={() => navigate(`/receipt/${order.id}`)}>📄 View</button>
                        {canEdit && (
                          editingStatus?.id === order.id ? (
                            <>
                              <button className="btn-edit" onClick={handleStatusUpdate}>✅ Save</button>
                              <button className="btn-delete" onClick={() => setEditingStatus(null)}>✕</button>
                            </>
                          ) : (
                            <button className="btn-edit" onClick={() => setEditingStatus({ id: order.id, status: order.status })}>
                              ✏️ Status
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'rgba(255,215,0,0.05)', fontWeight: 'bold' }}>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '20px' }}>TOTAL REVENUE FOR THIS VIEW:</td>
                    <td style={{ color: 'var(--gold)', fontSize: '18px' }}>₦{filteredOrders.reduce((acc, o) => acc + o.total_amount, 0).toLocaleString()}</td>
                    <td colSpan={3}></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="cms-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="cms-modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <h3>Record New Sale / Order</h3>
            <form onSubmit={handleCreateOrder} className="auth-form">
              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={newOrder.customer_name}
                  onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Payment Mode</label>
                <select value={newOrder.payment_mode} onChange={(e) => setNewOrder({...newOrder, payment_mode: e.target.value})}>
                  <option value="Transfer">Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="POS">POS</option>
                </select>
              </div>

              <div className="order-items-section">
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '10px', color: 'var(--text2)' }}>
                  ORDER ITEMS
                </label>
                {newOrder.items.map((item, index) => (
                  <div key={index} className="form-row" style={{ marginBottom: '10px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 3 }}>
                      <label>Product</label>
                      <select
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', parseInt(e.target.value))}
                        required
                      >
                        <option value="0">Select Product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                            {p.name} ({p.sku}) - Stock: {p.stock_quantity}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                        required
                      />
                    </div>
                    {newOrder.items.length > 1 && (
                      <button type="button" className="btn-delete" style={{ padding: '10px', height: '40px' }} onClick={() => handleRemoveItem(index)}>
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={handleAddItem}>
                  + Add Another Product
                </button>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Statement Modal */}
      {showStatementModal && (
        <div className="cms-modal-overlay" onClick={() => setShowStatementModal(false)}>
          <div className="cms-modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <h3>Generate Sales Statement</h3>
            <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '20px' }}>
              Select a date range to compile an official statement of account. 
              Leave fields blank to query all history.
            </p>
            <form onSubmit={generateStatement} className="auth-form">
              <div className="form-group mb-3">
                <label>Start Date</label>
                <input 
                  type="date" 
                  className="form-control bg-dark border-secondary text-white"
                  value={statementStart}
                  onChange={(e) => setStatementStart(e.target.value)} 
                />
              </div>
              <div className="form-group mb-4">
                <label>End Date</label>
                <input 
                  type="date" 
                  className="form-control bg-dark border-secondary text-white"
                  value={statementEnd}
                  onChange={(e) => setStatementEnd(e.target.value)} 
                />
              </div>
              
              <div className="modal-actions" style={{ marginTop: '30px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowStatementModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Generate PDF Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
