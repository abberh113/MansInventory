import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';

import type { ApiError } from '../types';

const ROLES = [
  { value: 'normal_staff', label: 'Normal Staff' },
  { value: 'hr', label: 'HR' },
  { value: 'super_head', label: 'Super Head' },
];

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '', role: 'normal_staff' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await registerUser({ full_name: form.full_name, email: form.email, password: form.password, role: form.role });
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(typeof apiErr.response?.data?.detail === 'string' ? apiErr.response.data.detail : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-overlay" />
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <span className="auth-brand-icon">👑</span>
          <h1 className="auth-brand-name">Mans Luxury Empire</h1>
          <p className="auth-brand-sub">Create Your Account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-fullname">Full Name</label>
              <input id="reg-fullname" type="text" placeholder="e.g. John Doe" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="reg-email">Email Address</label>
              <input id="reg-email" type="email" placeholder="Enter your email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input id="reg-password" type="password" placeholder="Create a password" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <input id="reg-confirm" type="password" placeholder="Re-enter password" value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="reg-role">Role</label>
            <select id="reg-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">Already have an account? <Link to="/login" className="link-accent">Sign In</Link></p>
      </div>
    </div>
  );
};

export default RegisterPage;
