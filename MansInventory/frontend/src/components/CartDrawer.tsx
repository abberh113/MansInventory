import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { API_BASE_URL, createOrder } from '../services/api';
import { useNavigate } from 'react-router-dom';

const CartDrawer: React.FC = () => {
  const { cart, removeFromCart, updateCartQty, cartTotal, clearCart, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const [checkoutForm, setCheckoutForm] = useState({ customerName: '', paymentMode: 'Transfer' });
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState('');

  if (!isCartOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsCheckingOut(true); setError('');
    try {
      const orderData = {
        customer_name: checkoutForm.customerName,
        payment_mode: checkoutForm.paymentMode,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      };
      const res = await createOrder(orderData);
      const savedOrder = res.data;
      
      clearCart();
      setIsCartOpen(false);
      setCheckoutForm({ customerName: '', paymentMode: 'Transfer' });
      navigate(`/receipt/${savedOrder.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Order failed. Please check stock levels.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button className="btn-close" onClick={() => setIsCartOpen(false)}>✕</button>
        </div>
        
        <div className="cart-items">
          {error && <div className="alert alert-error">{error}</div>}
          {cart.length === 0 ? (
            <div className="text-center py-5">
              <span style={{ fontSize: '50px' }}>🛒</span>
              <p className="mt-3 text-secondary">Your cart is empty.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="cart-item">
                <div className="cart-item-img">
                  {item.product.image_path ? (
                    <img src={`${API_BASE_URL}${item.product.image_path}`} alt="cart-p" />
                  ) : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#111', fontSize:'20px' }}>📦</div>}
                </div>
                <div className="cart-item-details">
                  <span className="cart-item-name">{item.product.name}</span>
                  <span className="cart-item-price">₦{item.product.price.toLocaleString()}</span>
                  <div className="cart-item-controls">
                    <button className="qty-btn" onClick={() => updateCartQty(item.product.id, -1)}>-</button>
                    <span className="qty-num">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateCartQty(item.product.id, 1)}>+</button>
                    <button className="btn-remove-item ms-auto" onClick={() => removeFromCart(item.product.id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <form onSubmit={handleCheckout}>
              <div className="form-group mb-3">
                <label style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'bold' }}>CUSTOMER FULL NAME</label>
                <input 
                  className="form-control bg-dark border-secondary text-white"
                  placeholder="Enter customer name" 
                  value={checkoutForm.customerName} 
                  onChange={(e) => setCheckoutForm({...checkoutForm, customerName: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group mb-4">
                <label style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 'bold' }}>PAYMENT METHOD</label>
                <select 
                  className="form-select bg-dark border-secondary text-white"
                  value={checkoutForm.paymentMode}
                  onChange={(e) => setCheckoutForm({...checkoutForm, paymentMode: e.target.value})}
                >
                  <option value="Transfer">Bank Transfer</option>
                  <option value="Cash">Cash Payment</option>
                  <option value="Card">Card Swipe</option>
                  <option value="POS">Point of Sale (POS)</option>
                </select>
              </div>
              
              <div className="cart-total-row">
                <span className="total-label">Subtotal</span>
                <span className="total-value">₦{cartTotal.toLocaleString()}</span>
              </div>
              
              <button type="submit" className="btn-checkout" disabled={isCheckingOut}>
                {isCheckingOut ? 'Processing Order...' : 'Record Transaction'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
