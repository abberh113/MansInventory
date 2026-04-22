import React, { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword, confirmUser, toggleUserActive } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_confirmed: boolean;
  is_active: boolean;
}

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'normal_staff' });
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role: '' });
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await createUser(form);
      setSuccess('User created and auto-confirmed.');
      setShowModal(false);
      setForm({ full_name: '', email: '', password: '', role: 'normal_staff' });
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create user.');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError(''); setSuccess('');
    try {
      await updateUser(selectedUser.id, editForm);
      setSuccess('User account updated.');
      setShowEditModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Update failed.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setError(''); setSuccess('');
    try {
      const res = await resetUserPassword(selectedUser.id, newPassword);
      setSuccess(res.data.message || `Password for ${selectedUser.full_name} has been reset.`);
      setShowResetModal(false);
      setNewPassword('');
    } catch {
      setError('Password reset failed.');
    }
  };

  const handleConfirmAction = async (userId: number) => {
    setError(''); setSuccess('');
    try {
      await confirmUser(userId);
      setSuccess('Member account confirmed and active.');
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Confirmation failed.');
    }
  };

  const handleToggleActive = async (userId: number) => {
    setError(''); setSuccess('');
    try {
      const res = await toggleUserActive(userId);
      setSuccess(res.data.message);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Action failed.');
    }
  };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setEditForm({ full_name: u.full_name, email: u.email, role: u.role });
    setShowEditModal(true);
  };

  const openReset = (u: User) => {
    setSelectedUser(u);
    setShowResetModal(true);
  };

  const handleDelete = async (userId: number) => {
    if (userId === currentUser?.id) {
      setError("You cannot delete your own account.");
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(userId);
      setSuccess('User deleted.');
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'super_admin': return 'badge bg-danger shadow-sm';
      case 'admin': return 'badge bg-warning text-dark shadow-sm';
      case 'hr': return 'badge bg-info text-dark shadow-sm';
      default: return 'badge bg-secondary shadow-sm';
    }
  };

  // Permission Logic
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';
  const isHR = currentUser?.role === 'hr';
  
  // Who can see the "Add New Member" button (Only SuperAdmin and Admin)
  const canCreate = isSuperAdmin || isAdmin;
  
  // Who can see management actions (Edit, Reset, Delete)
  const canManage = (u: User) => {
    if (isSuperAdmin) return true;
    if (isAdmin) {
      // Admin can manage normal users and staff, but NOT other admins or super admins
      return u.role !== 'super_admin' && u.role !== 'admin';
    }
    return false; // HR is Read Only except for confirm
  };
  
  // Who can confirm users
  const canConfirm = isSuperAdmin || isAdmin || isHR;

  return (
    <div className="page-wrapper container py-5">
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-5">
        <div className="mb-3 mb-md-0">
          <h1 className="page-title fw-bold text-white mb-1 h2">System Staff</h1>
          <p className="page-subtitle text-secondary mb-0">Manage roles, credentials, and access permissions</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary d-flex align-items-center px-4 py-2 fw-bold shadow" onClick={() => setShowModal(true)}>
            <span className="fs-4 me-2">+</span> Add New Member
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger border-0 shadow-sm mb-4 animate__animated animate__pulse">{error}</div>}
      {success && <div className="alert alert-success border-0 shadow-sm mb-4 animate__animated animate__fadeIn">{success}</div>}

      <div className="table-card bg-dark border border-secondary rounded-4 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-5 text-center">
            <div className="spinner-border text-primary mb-3"></div>
            <p className="text-secondary">Retrieving staff records...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-hover mb-0 align-middle">
              <thead className="bg-black text-secondary small text-uppercase fw-bold">
                <tr>
                  <th className="ps-4 py-3">Member Details</th>
                  <th>Designation</th>
                  <th>Confirmation Status</th>
                  <th>Account Status</th>
                  <th className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody className="border-top-0">
                {users.map((u) => (
                  <tr key={u.id} className={`${!u.is_confirmed ? 'opacity-75' : ''} border-secondary-subtle`}>
                    <td className="ps-4 py-4">
                      <div className="d-flex align-items-center">
                        <div className="avatar me-3 bg-gradient bg-secondary text-white rounded-3 fs-5 d-flex align-items-center justify-content-center" style={{width: '45px', height: '45px', background: 'linear-gradient(135deg, #1d1e22 0%, #343a40 100%)'}}>
                          {u.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold text-white fs-6 mb-1">{u.full_name}</div>
                          <div className="small text-secondary">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${getRoleBadgeClass(u.role)} px-3 py-2 rounded-2`}>
                        {u.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_confirmed ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border px-3 py-2`}>
                        {u.is_confirmed ? 'CONFIRMED ✅' : 'PENDING ⏳'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'bg-info-subtle text-info' : 'bg-danger-subtle text-danger'} border px-3 py-2`}>
                        {u.is_active ? 'ACTIVE' : 'SUSPENDED 🚫'}
                      </span>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-flex justify-content-end gap-2">
                        {canConfirm && !u.is_confirmed && (
                          <button className="btn btn-success btn-sm px-3 rounded-2" onClick={() => handleConfirmAction(u.id)}>Confirm User</button>
                        )}
                        {canManage(u) && (
                          <>
                            <button 
                              className={`btn ${u.is_active ? 'btn-outline-danger' : 'btn-outline-success'} btn-sm px-3 rounded-2`} 
                              onClick={() => handleToggleActive(u.id)}
                              title={u.is_active ? 'Suspend Account' : 'Re-activate Account'}
                            >
                              {u.is_active ? '🚫 Suspend' : '✅ Activate'}
                            </button>
                            <button className="btn btn-outline-info btn-sm px-3 rounded-2" onClick={() => openEdit(u)} title="Edit Profile">✏️ Edit</button>
                            <button className="btn btn-outline-warning btn-sm px-3 rounded-2" onClick={() => openReset(u)} title="Reset Password">🔑 Reset</button>
                            <button className="btn btn-outline-danger btn-sm px-3 rounded-2" onClick={() => handleDelete(u.id)} disabled={u.id === currentUser?.id} title="Delete Account">🗑️</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="cms-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-black border-secondary p-4 d-flex justify-content-between align-items-center">
              <h5 className="modal-title fw-bold text-white">Register New Staff</h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px' }}>✕</button>
            </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body p-4 bg-dark">
                  <div className="mb-4">
                    <label className="form-label text-secondary small fw-bold">FULL NAME</label>
                    <input type="text" className="form-control form-control-lg bg-black text-white border-secondary shadow-none px-3" placeholder="e.g. John Doe" required value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} />
                  </div>
                  <div className="mb-4">
                    <label className="form-label text-secondary small fw-bold">EMAIL ADDRESS</label>
                    <input type="email" className="form-control form-control-lg bg-black text-white border-secondary shadow-none px-3" placeholder="e.g. john@mansluxury.com" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                  </div>
                  <div className="mb-4">
                    <label className="form-label text-secondary small fw-bold">TEMPORARY PASSWORD</label>
                    <input type="password" className="form-control form-control-lg bg-black text-white border-secondary shadow-none px-3" placeholder="Minimal 8 characters" required value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-secondary small fw-bold">ROLE ASSIGNMENT</label>
                    <select className="form-select form-select-lg bg-black text-white border-secondary shadow-none px-3" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                      {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                      {isSuperAdmin && <option value="admin">Administrator</option>}
                      <option value="hr">Human Resources</option>
                      <option value="super_head">Super Head</option>
                      <option value="normal_staff">Standard Staff</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer bg-black border-secondary p-4 d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={() => setShowModal(false)}>Discard</button>
                  <button type="submit" className="btn btn-primary px-5 flex-grow-1">Create Account</button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="cms-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-black border-secondary p-4 d-flex justify-content-between align-items-center">
              <h5 className="modal-title fw-bold text-white">Update {selectedUser.full_name}</h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px' }}>✕</button>
            </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body p-4 bg-dark">
                  <div className="mb-4">
                    <label className="form-label text-secondary small fw-bold">NEW FULL NAME</label>
                    <input type="text" className="form-control form-control-lg bg-black text-white border-secondary px-3" placeholder={selectedUser.full_name} value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} />
                  </div>
                  <div className="mb-4">
                    <label className="form-label text-secondary small fw-bold">NEW EMAIL ADDRESS</label>
                    <input type="email" className="form-control form-control-lg bg-black text-white border-secondary px-3" placeholder={selectedUser.email} value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="mb-4">
                    <label className="form-label text-secondary small fw-bold">RE-ASSIGN ROLE</label>
                    <select className="form-select form-select-lg bg-black text-white border-secondary px-3" value={editForm.role} disabled={!isSuperAdmin} onChange={(e) => setEditForm({...editForm, role: e.target.value})}>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Administrator</option>
                      <option value="hr">Human Resources</option>
                      <option value="super_head">Super Head</option>
                      <option value="normal_staff">Standard Staff</option>
                    </select>
                    {!isSuperAdmin && <small className="text-secondary mt-1 d-block">Only Super Admins can re-assign roles.</small>}
                  </div>
                </div>
                <div className="modal-footer bg-black border-secondary p-4 d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-info flex-grow-1 text-black fw-bold">Apply Changes</button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="cms-modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="cms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header bg-black border-warning border-opacity-25 p-4 d-flex justify-content-between align-items-center">
              <h5 className="modal-title fw-bold text-warning">Force Reset Password</h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowResetModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px' }}>✕</button>
            </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body p-4 bg-dark">
                  <p className="text-secondary small mb-4 mt-1">You are resetting the password for <strong className="text-white">{selectedUser.full_name}</strong> ({selectedUser.email}). This change is irreversible.</p>
                  <div>
                    <label className="form-label text-warning small fw-bold">NEW MASTER PASSWORD</label>
                    <input type="password" autoFocus className="form-control form-control-lg bg-black text-white border-warning border-opacity-50 px-3" placeholder="Enter new strong password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <div className="form-text text-secondary mt-2">The user will receive an automated email about this change.</div>
                  </div>
                </div>
                <div className="modal-footer bg-black border-warning border-opacity-25 p-4 d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={() => setShowResetModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-warning flex-grow-1 text-black fw-bold px-4">Reset Now 🔐</button>
                </div>
              </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
