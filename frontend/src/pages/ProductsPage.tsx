import React, { useEffect, useState, useRef } from 'react';
import { getProducts, createProduct, updateProduct, getCategories, API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
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

interface MultiAddItem {
  id: string;
  file: File;
  preview: string;
  name: string;
  sku: string;
  price: string;
  stock_quantity: string;
  category_id: string;
}

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const role = user?.role?.toLowerCase();
  const canEdit = role === 'super_admin' || role === 'admin';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showMultiAddModal, setShowMultiAddModal] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', price: '', stock_quantity: '', category_id: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [multiAddItems, setMultiAddItems] = useState<MultiAddItem[]>([]);
  const [activeMultiIndex, setActiveMultiIndex] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isProcessingImages, setIsProcessingImages] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const multiFileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setProducts(p.data);
      setCategories(c.data);
    } catch { setError('Failed to load products.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditItem(null);
    const firstCat = categories.length > 0 ? String(categories[0].id) : '';
    setForm({ name: '', sku: '', price: '', stock_quantity: '', category_id: firstCat });
    setSelectedFile(null);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditItem(p);
    setForm({ name: p.name, sku: p.sku, price: String(p.price), stock_quantity: String(p.stock_quantity), category_id: String(p.category_id) });
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const fd = new FormData();
    fd.append('name', form.name); fd.append('sku', form.sku); fd.append('price', form.price);
    fd.append('stock_quantity', form.stock_quantity); fd.append('category_id', form.category_id);
    if (selectedFile) fd.append('image', selectedFile);

    try {
      if (editItem) await updateProduct(editItem.id, fd);
      else await createProduct(fd);
      setShowModal(false); fetchData();
      setSuccess(editItem ? 'Product updated.' : 'Product created.');
    } catch (err: any) { setError(err?.response?.data?.detail || 'Operation failed.'); }
  };

  const generatePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const onMultiFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setIsProcessingImages(true);
    try {
      const newItems = await Promise.all(files.map(async (file) => {
        const preview = await generatePreview(file);
        return {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview,
          name: '',
          sku: `SKU-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          price: '',
          stock_quantity: '0',
          category_id: categories[0]?.id?.toString() || ''
        };
      }));
      const startIdx = multiAddItems.length;
      setMultiAddItems(prev => [...prev, ...newItems]);
      setActiveMultiIndex(startIdx);
      setShowMultiAddModal(true);
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const updateMultiItem = (id: string, field: keyof MultiAddItem, value: string) => {
    setMultiAddItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeMultiItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = multiAddItems.filter(i => i.id !== id);
    if (updated.length === 0) setShowMultiAddModal(false);
    else if (activeMultiIndex >= updated.length) setActiveMultiIndex(updated.length - 1);
    setMultiAddItems(updated);
  };

  const handleMultiSaveAll = async () => {
    setLoading(true); setError(''); setSuccess('');
    let count = 0;
    const items = [...multiAddItems];
    setShowMultiAddModal(false); 
    setMultiAddItems([]);
    for (const item of items) {
      const fd = new FormData();
      fd.append('name', item.name || item.file.name);
      fd.append('sku', item.sku);
      fd.append('price', item.price || '0');
      fd.append('stock_quantity', item.stock_quantity);
      fd.append('category_id', item.category_id);
      fd.append('image', item.file);
      try {
        await createProduct(fd);
        count++;
      } catch (err) { console.error('Failed', item.name, err); }
    }
    setSuccess(`Successfully added ${count} products.`);
    fetchData();
  };

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

  const currentMulti = multiAddItems[activeMultiIndex];

  return (
    <div className="page-wrapper">
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="page-title">Catalog</h1>
          <p className="page-subtitle">Premium product gallery and management</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <input type="file" multiple accept="image/*" style={{ display: 'none' }} ref={multiFileInputRef} onChange={onMultiFilesSelect} />
          {canEdit && (
            <>
              <button className="btn btn-outline-info btn-sm" onClick={() => multiFileInputRef.current?.click()}>🤳 Batch Add</button>
              <button className="btn btn-primary btn-sm px-3" onClick={openCreate}>+ New Product</button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={exportToCSV}>📤 Export</button>
        </div>
      </div>

      <div className="filter-bar row g-2 g-md-3 mb-4 mx-0 p-3 bg-dark-subtle rounded border border-secondary-subtle align-items-center">
        <div className="col-12 col-md-8">
          <input 
            type="text" 
            className="form-control form-control-md form-control-md-lg bg-dark text-white border-secondary shadow-sm"
            placeholder="Search by name or SKU..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="col-12 col-md-4">
          <select 
            className="form-select form-select-md form-select-md-lg bg-dark text-white border-secondary shadow-sm"
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {isProcessingImages && <div className="alert alert-success" style={{ background: 'rgba(212,168,67,0.1)' }}>✨ Optimizing high-res images for preview...</div>}

      {loading ? <div className="loading-text">Optimizing product catalog...</div> : (
        <div className="products-grid">
           {filteredProducts.map((p) => (
             <div key={p.id} className="product-card">
               <div className="product-card-image" onClick={() => setViewProduct(p)}>
                 {p.image_path ? (
                   <img src={`${API_BASE_URL}${p.image_path}`} alt={p.name} />
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {canEdit && (
                        <button className="qty-btn" onClick={() => openEdit(p)} title="Edit">✏️</button>
                      )}
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
             </div>
           ))}
           {filteredProducts.length === 0 && (
             <div className="text-center py-5 w-100" style={{ gridColumn: '1/-1', color: 'var(--text3)' }}>
               <h3>No products found matching your search.</h3>
             </div>
           )}
        </div>
      )}

      {/* Product Create/Edit Modal */}
      {showModal && (
        <div className="cms-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{editItem ? 'Edit Product' : 'New Product'}</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="auth-form">
              <div className="form-group">
                <label>Product Name</label>
                <input placeholder="Rolex, Patek, etc." type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>SKU</label>
                  <input placeholder="SKU" type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                    <option value="">Select Category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                   <label>Price (₦)</label>
                   <input placeholder="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="form-group">
                   <label>Stock Quantity</label>
                   <input placeholder="Stock" type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Product Image</label>
                <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              </div>
              <div className="cms-modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Style Multi-Add Modal */}
      {showMultiAddModal && currentMulti && (
        <div className="multi-add-overlay" onClick={() => setShowMultiAddModal(false)}>
          <div className="multi-add-main" onClick={(e) => e.stopPropagation()}>
            <div className="multi-add-header">
              <button className="btn-close" onClick={() => setShowMultiAddModal(false)}>✕</button>
              <span className="batch-count">{activeMultiIndex + 1} of {multiAddItems.length}</span>
              <button className="btn-send" onClick={handleMultiSaveAll}>Upload All 🚀</button>
            </div>
            <div className="multi-add-content">
              <div className="multi-add-preview">
                <img src={currentMulti.preview} alt="main-preview" />
                <div className="image-actions">
                   <button onClick={(e) => removeMultiItem(currentMulti.id, e)} className="btn-action-round">🗑️</button>
                   <button onClick={() => multiFileInputRef.current?.click()} className="btn-action-round">➕</button>
                </div>
              </div>
              <div className="multi-add-sidebar">
                <h3>Product Details</h3>
                <div className="auth-form">
                  <div className="form-group">
                    <label>Product Name</label>
                    <input autoFocus placeholder="e.g. Rolex Submariner" value={currentMulti.name} onChange={(e) => updateMultiItem(currentMulti.id, 'name', e.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Price (₦)</label>
                      <input type="number" placeholder="Price" value={currentMulti.price} onChange={(e) => updateMultiItem(currentMulti.id, 'price', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Stock</label>
                      <input type="number" placeholder="Stock" value={currentMulti.stock_quantity} onChange={(e) => updateMultiItem(currentMulti.id, 'stock_quantity', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>SKU</label>
                    <input placeholder="SKU" value={currentMulti.sku} onChange={(e) => updateMultiItem(currentMulti.id, 'sku', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={currentMulti.category_id} onChange={(e) => updateMultiItem(currentMulti.id, 'category_id', e.target.value)}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="multi-add-strip">
              <div className="strip-scroll">
                {multiAddItems.map((item, idx) => (
                  <div 
                    key={item.id} 
                    className={`strip-item ${idx === activeMultiIndex ? 'active' : ''}`}
                    onClick={() => setActiveMultiIndex(idx)}
                  >
                    <img src={item.preview} alt="thumb" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {viewProduct && (
        <div className="cms-modal-overlay" onClick={() => setViewProduct(null)}>
          <div className="cms-modal" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
            <div className="product-detail-view">
              <div className="product-detail-image">
                {viewProduct.image_path ? (
                  <img src={`${API_BASE_URL}${viewProduct.image_path}`} alt="detail" />
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

export default ProductsPage;
