import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="auth-page" style={{ flexDirection: 'column', textAlign: 'center' }}>
      <div className="auth-bg-overlay" />
      
      <div className="landing-content" style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
        <div className="auth-brand" style={{ marginBottom: '40px' }}>
          <span className="auth-brand-icon" style={{ fontSize: '64px' }}>👑</span>
          <h1 className="auth-brand-name" style={{ fontSize: '48px' }}>MANS LUXURY EMPIRE</h1>
          <p className="auth-brand-sub" style={{ fontSize: '16px', letterSpacing: '0.2em' }}>INVENTORY MANAGEMENT SYSTEM</p>
        </div>

        <h2 style={{ fontSize: '32px', marginBottom: '20px', color: 'var(--text)' }}>
          Excellence in <span style={{ color: 'var(--gold)' }}>Inventory Control</span>
        </h2>
        
        <p style={{ color: 'var(--text2)', fontSize: '18px', marginBottom: '40px', lineHeight: '1.8' }}>
          A bespoke, secure, and robust platform designed specifically for the elite management 
          of luxury assets, products, and global orders. Empower your staff with role-based 
          access and real-time analytics.
        </p>

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <Link to="/login" className="btn-primary" style={{ padding: '15px 40px', fontSize: '16px' }}>
            Access System
          </Link>
          <Link to="/register" className="btn-secondary" style={{ padding: '15px 40px', fontSize: '16px' }}>
            Request Access
          </Link>
        </div>

        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px', marginTop: '80px' }}>
          <div className="stat-card" style={{ flexDirection: 'column', textAlign: 'center', padding: '30px', cursor: 'default' }}>
            <div className="stat-icon" style={{ fontSize: '40px', marginBottom: '15px' }}>🛡️</div>
            <h4 style={{ color: 'var(--gold)', marginBottom: '10px' }}>Secure RBAC</h4>
            <p style={{ fontSize: '13px', color: 'var(--text2)' }}>Granular control for Admins, HR, and Staff roles.</p>
          </div>
          <div className="stat-card" style={{ flexDirection: 'column', textAlign: 'center', padding: '30px', cursor: 'default' }}>
            <div className="stat-icon" style={{ fontSize: '40px', marginBottom: '15px' }}>📊</div>
            <h4 style={{ color: 'var(--gold)', marginBottom: '10px' }}>Live Analytics</h4>
            <p style={{ fontSize: '13px', color: 'var(--text2)' }}>Real-time stock tracking and sales monitoring.</p>
          </div>
          <div className="stat-card" style={{ flexDirection: 'column', textAlign: 'center', padding: '30px', cursor: 'default' }}>
            <div className="stat-icon" style={{ fontSize: '40px', marginBottom: '15px' }}>📦</div>
            <h4 style={{ color: 'var(--gold)', marginBottom: '10px' }}>Order Flow</h4>
            <p style={{ fontSize: '13px', color: 'var(--text2)' }}>Seamless order processing from sale to completion.</p>
          </div>
        </div>
        
        <footer style={{ marginTop: '100px', color: 'var(--text3)', fontSize: '12px' }}>
          © {new Date().getFullYear()} Mans Luxury Empire. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
