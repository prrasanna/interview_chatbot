// src/pages/admin/EmailLogsPage.jsx
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const STATUS_MAP = { sent: 'status-approved', failed: 'status-overdue', mock: 'status-in_progress', queued: 'status-assigned' };

export default function EmailLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const params = { limit: 50, ...(statusFilter && { status: statusFilter }), ...(typeFilter && { type: typeFilter }) };
    api.get('/email-logs', { params }).then(r => { setLogs(r.data.data); setLoading(false); });
  }, [statusFilter, typeFilter]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Email Logs</h1>
            <p className="page-subtitle">Track all email deliveries and failures</p>
          </div>
          <div className="flex-gap">
            <select className="form-control" style={{ width: 140, padding: '8px 12px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="sent">Sent</option>
              <option value="mock">Mock (Dev)</option>
              <option value="failed">Failed</option>
            </select>
            <select className="form-control" style={{ width: 170, padding: '8px 12px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="task_assignment">Task Assignment</option>
              <option value="task_reminder">Task Reminder</option>
              <option value="meeting_invite">Meeting Invite</option>
              <option value="feedback">Feedback</option>
              <option value="welcome">Welcome</option>
            </select>
          </div>
        </div>
      </div>
      <div className="table-container">
        <div className="table-wrapper">
          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : !logs.length ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Mail size={48} opacity={0.3} /></div>
              <h3>No email logs yet</h3>
            </div>
          ) : (
            <table className="data-table">
              <thead><tr><th>To</th><th>Subject</th><th>Type</th><th>Status</th><th>Sent At</th><th>Mode</th></tr></thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontSize: 13 }}>{log.toName && <div style={{ fontWeight: 600 }}>{log.toName}</div>}{log.to}</td>
                    <td style={{ fontSize: 13, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.subject}</td>
                    <td><span style={{ fontSize: 11, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', color: 'var(--text-muted)' }}>{log.type.replace(/_/g, ' ')}</span></td>
                    <td><span className={`status-badge ${STATUS_MAP[log.status] || 'status-assigned'}`}>{log.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.sentAt ? new Date(log.sentAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}</td>
                    <td>
                      {log.isMock
                        ? <span style={{ color: 'var(--warning)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> Mock</span>
                        : <span style={{ color: 'var(--secondary)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Real</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
