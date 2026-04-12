import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrders, getProducts } from '../services/api';

interface OrderItem { id: number; product_id: number; quantity: number; unit_price: number }
interface Order { id: number; customer_name: string; status: string; total_amount: number; staff_email: string; items: OrderItem[]; created_at: string; payment_mode: string }
interface Product { id: number; name: string; price: number }

const ReceiptPage: React.FC = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<Order | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [orderRes, prodRes] = await Promise.all([getOrders(), getProducts()]);
                const found = orderRes.data.find((o: Order) => o.id === Number(orderId));
                setOrder(found);
                setProducts(prodRes.data);
            } catch (err) {
                console.error("Failed to fetch receipt data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orderId]);

    const getProductName = (id: number) => products.find(p => p.id === id)?.name || 'Unknown Product';

    if (loading) return <div className="p-5 text-center text-white">Generating premium invoice...</div>;
    if (!order) return <div className="p-5 text-center text-white">Order not found.</div>;

    return (
        <div className="receipt-page-container min-vh-100 bg-dark py-5">
            {/* ACTION BAR (HIDDEN DURING PRINT) */}
            <div className="container d-print-none mb-4" style={{ maxWidth: '800px' }}>
                <div className="card bg-black border-secondary p-3 d-flex flex-row gap-3 align-items-center">
                    <button className="btn btn-outline-secondary text-white" onClick={() => navigate('/products')}>⬅️ Back to POS</button>
                    <div className="ms-auto d-flex gap-2">
                        <button 
                            className={`btn btn-sm px-3 rounded-pill fw-bold ${printMode === 'thermal' ? 'btn-primary' : 'btn-outline-secondary text-white'}`}
                            onClick={() => setPrintMode('thermal')}
                        >📟 Thermal</button>
                        <button 
                            className={`btn btn-sm px-3 rounded-pill fw-bold ${printMode === 'a4' ? 'btn-primary' : 'btn-outline-secondary text-white'}`}
                            onClick={() => setPrintMode('a4')}
                        >📄 A4 Luxury</button>
                    </div>
                    <button className="btn btn-primary fw-bold px-4" onClick={() => window.print()}>🖨️ Print Receipt</button>
                </div>
            </div>

            {/* THE ACTUAL RECEIPT */}
            <div className={`mx-auto bg-white text-black shadow-lg rounded-3 ${printMode === 'a4' ? 'receipt-a4 p-5' : 'receipt-thermal p-4'}`} id="printable-receipt" style={{ minHeight: '400px', maxWidth: printMode === 'a4' ? '210mm' : '80mm' }}>
                <div className="p-4">
                    <div className="text-center mb-4 pb-3 border-bottom border-2 text-dark">
                        <h1 className="fw-bolder mb-1 text-dark" style={{ letterSpacing: '2px', fontSize: '32px' }}>OF MANS EMPIRE</h1>
                        <p className="text-uppercase fw-bold mb-3 text-secondary" style={{ fontSize: '14px', letterSpacing: '5px' }}>RECEIPT</p>
                        <div className="text-muted" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                            <div className="fw-semibold">No.3&4 REMAIN Plaza Opp Zone 1, BUK Road, Kano</div>
                            <div>08036830146 &nbsp;|&nbsp; mansluxurystore@gmail.com</div>
                            <div>www.mans.ng</div>
                        </div>
                    </div>

                    <div className="row mb-4 g-3 align-items-center">
                        <div className="col-6 text-start">
                            <span className="badge bg-light text-dark border mb-2 text-uppercase" style={{ letterSpacing: '1px' }}>Billed To</span>
                            <h6 className="fw-bold text-uppercase mb-1">{order.customer_name}</h6>
                            <div className="badge bg-secondary text-white" style={{ fontSize: '10px' }}>{order.payment_mode || 'Cash'}</div>
                        </div>
                        <div className="col-6 text-end">
                            <span className="badge bg-light text-dark border mb-2 text-uppercase" style={{ letterSpacing: '1px' }}>Receipt No</span>
                            <h6 className="fw-bold mb-1">RCT-#{String(order.id).padStart(5, '0')}</h6>
                            <div className="text-muted small" style={{ fontSize: '11px' }}>{new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                        </div>
                    </div>

                    <table className="table table-borderless mt-4 w-100">
                        <thead className="border-bottom border-top border-2 border-dark bg-light">
                            <tr className="text-uppercase text-muted" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>
                                <th className="ps-2 py-2">Description</th>
                                <th className="text-center py-2">Qty</th>
                                <th className="text-end pe-2 py-2">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="border-bottom border-2 border-dark" style={{ fontSize: '14px' }}>
                            {order.items.map(item => (
                                <tr key={item.id} className="border-bottom" style={{ borderColor: '#f0f0f0' }}>
                                    <td className="ps-2 py-3 align-middle">
                                        <div className="fw-bold text-dark">{getProductName(item.product_id)}</div>
                                    </td>
                                    <td className="text-center py-3 align-middle fw-medium">{item.quantity}</td>
                                    <td className="text-end pe-2 py-3 align-middle fw-bold">₦{(item.quantity * item.unit_price).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={2} className="ps-2 py-4 fw-bold text-uppercase text-muted" style={{ fontSize: '14px' }}>Total Amount:</td>
                                <td className="text-end pe-2 py-4 fw-bolder text-dark" style={{ fontSize: '22px' }}>₦{order.total_amount.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="card mt-4 text-center bg-light border-0" style={{ border: '2px dashed #ced4da !important' }}>
                        <div className="card-body p-3">
                            <p className="mb-1 fw-bold text-uppercase text-dark" style={{ fontSize: '10px', letterSpacing: '1px' }}>Terms & Conditions</p>
                            <p className="mb-0 text-muted" style={{ fontSize: '9px', lineHeight: 1.4 }}>
                                NO REFUND AFTER PAYMENT | EXCHANGE WITHIN 24 HOURS ONLY WITH ORIGINAL RECEIPT | THANK YOU FOR YOUR PATRONAGE
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 text-center pt-4 border-top text-muted small text-uppercase" style={{ letterSpacing: '3px', fontSize: '9px' }}>
                        End of Receipt
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .receipt-page-container { padding: 0 !important; background: white !important; }
                    body * { visibility: hidden !important; }
                    #printable-receipt, #printable-receipt * { visibility: visible !important; }
                    #printable-receipt {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .receipt-thermal { width: 80mm !important; }
                    .receipt-a4 { width: 210mm !important; min-height: 297mm !important; }
                    .d-print-none { display: none !important; }
                }

                @media (max-width: 600px) {
                    .receipt-page-container { padding: 10px !important; }
                    #printable-receipt { 
                        width: 100% !important; 
                        max-width: 100% !important; 
                        padding: 15px !important; 
                    }
                    .receipt-a4 { padding: 20px !important; }
                    h1 { font-size: 20px !important; }
                }
                .ls-wide { letter-spacing: 1px; }
            `}</style>
        </div>
    );
};

export default ReceiptPage;
