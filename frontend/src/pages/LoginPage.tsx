import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';
import type { ApiError } from '../types';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmitting = React.useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setError('');
    setLoading(true);
    try {
      const res = await loginUser(form.email, form.password);
      await login(res.data.access_token, res.data.user_role);
      navigate('/dashboard');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(typeof apiErr.response?.data?.detail === 'string' ? apiErr.response.data.detail : 'Invalid email or password.');
      isSubmitting.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-overlay" />
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">👑</span>
          <h1 className="auth-brand-name">Mans Luxury Empire</h1>
          <p className="auth-brand-sub">Inventory Management System</p>
        </div>

        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Sign in to manage your empire</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="form-footer">
            <Link to="/forgot-password" className="link-subtle">Forgot password?</Link>
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register" className="link-accent">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
