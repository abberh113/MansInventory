import React, { useEffect, useState } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Category { id: number; name: string; description: string }

const CategoriesPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  const canEdit = role === 'super_admin' || role === 'admin';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch { setError('Failed to load categories.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setError(''); setEditItem(null); setForm({ name: '', description: '' }); setShowModal(true); };
  const openEdit = (cat: Category) => { setError(''); setEditItem(cat); setForm({ name: cat.name, description: cat.description || '' }); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const payload = { 
        name: form.name, 
        description: form.description.trim() || undefined 
      };
      
      if (editItem) { await updateCategory(editItem.id, payload); }
      else { await createCategory(payload); }
      
      setShowModal(false);
      fetchData();
    } catch (err: any) { 
      setError(err?.response?.data?.detail || 'Operation failed. Check if name is unique.'); 
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    try { await deleteCategory(id); fetchData(); }
    catch (err: any) { setError(err?.response?.data?.detail || 'Delete failed.'); }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize your products into categories</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={openCreate}>+ New Category</button>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="loading-text">Loading categories...</div> : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Name</th><th>Description</th>{canEdit && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={4} className="empty-state">No categories yet. Add your first one!</td></tr>
              ) : categories.map((cat) => (
                <tr key={cat.id}>
                  <td data-label="ID">#{cat.id}</td>
                  <td data-label="Name"><span className="tag">{cat.name}</span></td>
                  <td data-label="Description">{cat.description || '—'}</td>
                  {canEdit && (
                    <td data-label="Actions" className="action-cell">
                      <button className="btn-edit" onClick={() => openEdit(cat)}>✏️ Edit</button>
                      <button className="btn-delete" onClick={() => handleDelete(cat.id)}>🗑️ Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="cms-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{editItem ? 'Edit Category' : 'New Category'}</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '20px', cursor: 'pointer' }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="auth-form">
              <div className="form-group">
                <label>Category Name</label>
                <input placeholder="e.g. Watches, Jewelry" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea placeholder="Briefly describe this category..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="cms-modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
