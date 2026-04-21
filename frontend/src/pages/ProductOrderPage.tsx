import React, { useEffect, useState } from 'react';
import { getProducts, getCategories, API_BASE_URL } from '../services/api';
import { useCart } from '../context/CartContext';

interface Category { id: number; name: string }
interface Product { 
  id: number; 
  name: string; 
  sku: string; 
  price: number; 
  stock_quantity: number; 
  category_id: number;
  image_path?: string;
}

const ProductOrderPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const { addToCart } = useCart();

  const fetchData = async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setProducts(p.data);
      setCategories(c.data);
    } catch { setError('Failed to load products.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getCategoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? '—';

  const filteredProducts = products.filter(p => {
    const ms = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const mc = selectedCategory === '' || p.category_id.toString() === selectedCategory;
    return ms && mc;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'SKU', 'Category', 'Price', 'Stock'];
    const rows = filteredProducts.map(p => [p.id, p.name, p.sku, getCategoryName(p.category_id), p.price, p.stock_quantity]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="page-wrapper">
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="page-title">Inventory Orders</h1>
          <p className="page-subtitle">Premium product gallery and management</p>
        </div>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={exportToCSV}>📤 Export Catalog</button>
        </div>
      </div>

      <div className="filter-bar row g-3 mb-4 mx-0 p-3 bg-dark-subtle rounded border border-secondary-subtle align-items-center">
        <div className="col-md-8">
          <input 
            type="text" 
            className="form-control form-control-lg bg-dark text-white border-secondary shadow-sm"
            placeholder="Search by name or SKU..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="col-md-4">
          <select 
            className="form-select form-select-lg bg-dark text-white border-secondary shadow-sm"
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="loading-text">Optimizing product catalog...</div> : (
        <div className="products-grid">
           {filteredProducts.map((p) => (
             <div key={p.id} className="product-card">
               <div className="product-card-image" onClick={() => setViewProduct(p)}>
                 {p.image_path ? (
                   <img 
                     src={p.image_path.startsWith('http') ? p.image_path : `${API_BASE_URL}${p.image_path}`} 
                     alt={p.name} 
                   />
                 ) : (
                   <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', fontSize: '40px' }}>📦</div>
                 )}
                 {p.stock_quantity <= 0 ? (
                   <span className="product-badge out">Out of Stock</span>
                 ) : p.stock_quantity < 5 ? (
                   <span className="product-badge">Only {p.stock_quantity} left</span>
                 ) : null}
               </div>

               <div className="product-card-body">
                 <span className="product-category">{getCategoryName(p.category_id)}</span>
                 <h3 className="product-name">{p.name}</h3>
                 <span className="product-sku">{p.sku}</span>
                 
                 <div className="product-footer">
                    <span className="product-price">₦{p.price.toLocaleString()}</span>
                    <button 
                      className="btn-add-cart" 
                      onClick={() => addToCart(p)}
                      disabled={p.stock_quantity <= 0}
                    >
                      +
                    </button>
                 </div>
               </div>
             </div>
           ))}
           {filteredProducts.length === 0 && (
             <div className="text-center py-5 w-100" style={{ gridColumn: '1/-1', color: 'var(--text3)' }}>
               <h3>No products found matching your search.</h3>
             </div>
           )}
        </div>
      )}

      {/* Product Detail Modal */}
      {viewProduct && (
        <div className="cms-modal-overlay" onClick={() => setViewProduct(null)}>
          <div className="cms-modal" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div className="product-detail-view">
              <div className="product-detail-image">
                {viewProduct.image_path ? (
                   <img 
                     src={viewProduct.image_path.startsWith('http') ? viewProduct.image_path : `${API_BASE_URL}${viewProduct.image_path}`} 
                     alt="detail" 
                   />
                ) : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#111', fontSize:'80px' }}>📦</div>}
              </div>
              <div className="product-detail-info">
                <span className="product-category">{getCategoryName(viewProduct.category_id)}</span>
                <h1>{viewProduct.name}</h1>
                <span className="product-detail-price">₦{viewProduct.price.toLocaleString()}</span>
                
                <p className="product-detail-desc">
                  This premium asset is part of the Mans Luxury Empire collection. 
                  Strict quality control and inventory tracking ensure absolute excellence.
                </p>

                <div className="product-detail-meta">
                  <div className="meta-row">
                     <span className="meta-label">Serial Number / SKU</span>
                     <span className="meta-value">{viewProduct.sku}</span>
                  </div>
                  <div className="meta-row">
                     <span className="meta-label">Current Stock Availability</span>
                     <span className="meta-value">{viewProduct.stock_quantity} Units</span>
                  </div>
                </div>

                <div className="d-flex gap-3">
                  <button 
                    className="btn-primary w-100 p-3 fw-bold" 
                    onClick={() => { addToCart(viewProduct); setViewProduct(null); }}
                    disabled={viewProduct.stock_quantity <= 0}
                  >
                    Add to Cart
                  </button>
                  <button className="btn-secondary p-3" onClick={() => setViewProduct(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductOrderPage;
