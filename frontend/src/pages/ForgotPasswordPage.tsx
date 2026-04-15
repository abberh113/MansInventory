import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/api';
import type { ApiError } from '../types';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setMessage(res.data.message || 'If an account exists, a reset link has been sent.');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(typeof apiErr.response?.data?.detail === 'string' ? apiErr.response.data.detail : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-overlay" />
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">🔐</span>
          <h1 className="auth-brand-name">Password Reset</h1>
          <p className="auth-brand-sub">Mans Luxury Empire</p>
        </div>

        <h2 className="auth-title">Forgot Password?</h2>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="reset-email">Email Address</label>
            <input
              id="reset-email"
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-switch">
          Remember your password? <Link to="/login" className="link-accent">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
