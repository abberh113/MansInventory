import React, { useEffect, useState } from 'react';
import { getAuditLogs } from '../services/api';

interface AuditLog {
  id: number;
  full_name: string;
  email: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await getAuditLogs();
      setLogs(res.data);
    } catch {
      setError('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadgeClass = (action: string) => {
    if (action.includes('CREATED')) return 'badge bg-primary shadow-sm';
    if (action.includes('UPDATED') || action.includes('CHANGED')) return 'badge bg-info text-dark shadow-sm';
    if (action.includes('DELETED') || action.includes('REMOVED')) return 'badge bg-danger shadow-sm';
    if (action.includes('SUSPENDED')) return 'badge bg-warning text-dark shadow-sm';
    if (action.includes('ACTIVATED')) return 'badge bg-success shadow-sm';
    
    switch (action) {
      case 'LOGIN': return 'badge bg-success shadow-sm';
      case 'LOGOUT': return 'badge bg-secondary shadow-sm';
      case 'PASSWORD_RESET': return 'badge bg-warning text-dark shadow-sm';
      case 'PASSWORD_RESET_ADMIN': return 'badge bg-danger shadow-sm';
      default: return 'badge bg-info text-dark shadow-sm';
    }
  };

  return (
    <div className="page-wrapper container py-5">
      <div className="page-header mb-5">
        <h1 className="page-title fw-bold text-white mb-1 h2">📊 Activity & Monitoring</h1>
        <p className="page-subtitle text-secondary">A comprehensive audit trail of system access and administrative actions</p>
      </div>

      {error && <div className="alert alert-danger border-0 shadow-sm mb-4">{error}</div>}

      <div className="table-card bg-dark border border-secondary rounded-4 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-5 text-center">
            <div className="spinner-border text-primary mb-3"></div>
            <p className="text-secondary">Scanning historical logs...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-dark table-hover mb-0 align-middle">
              <thead className="bg-black text-secondary small text-uppercase fw-bold">
                <tr>
                  <th className="ps-4 py-3">Timestamp</th>
                  <th>Member</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th className="text-end pe-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="border-top-0">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-5 text-secondary">No activity logs recorded yet.</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-secondary-subtle">
                      <td data-label="Timestamp" className="ps-4 py-4 small text-secondary">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td data-label="Member">
                        <div className="fw-bold text-white">{log.full_name}</div>
                        <div className="small text-secondary" style={{fontSize: '0.75rem'}}>{log.email}</div>
                      </td>
                      <td data-label="Action">
                        <span className={`${getActionBadgeClass(log.action)} px-3 py-2 rounded-2 small fw-bold`}>
                          {log.action}
                        </span>
                      </td>
                      <td data-label="Details" className="text-secondary small">
                        {log.details || '—'}
                      </td>
                      <td data-label="IP Address" className="text-end pe-4 small text-secondary">
                        <code>{log.ip_address || 'Internal'}</code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchLogs}>🔄 Refresh Logs</button>
      </div>
    </div>
  );
};

export default AuditLogsPage;
