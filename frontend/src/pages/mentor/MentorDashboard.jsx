// src/pages/mentor/MentorDashboard.jsx
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Link } from 'react-router-dom';
import { Users, ClipboardList, CalendarDays, MessageSquare } from 'lucide-react';

export default function MentorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/mentor').then(r => { setData(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!data) return <div className="alert alert-danger">Failed to load dashboard.</div>;

  const { assignedInterns, pendingReviews, todayMeetings, pendingFeedback } = data;

  const statCards = [
    { label: 'My Interns', value: assignedInterns?.length || 0, Icon: Users, color: 'purple' },
    { label: 'Pending Reviews', value: pendingReviews?.length || 0, Icon: ClipboardList, color: 'yellow' },
    { label: "Today's Meetings", value: todayMeetings?.length || 0, Icon: CalendarDays, color: 'teal' },
    { label: 'Feedback Pending', value: pendingFeedback?.length || 0, Icon: MessageSquare, color: 'red' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mentor Dashboard</h1>
        <p className="page-subtitle">Your assigned interns and pending actions</p>
      </div>

      <div className="grid-4 mb-3">
        {statCards.map(s => {
          const Icon = s.Icon;
          return (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.color}`}><Icon size={22} /></div>
              <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
            </div>
          );
        })}
      </div>

      <div className="grid-2">
        {/* Assigned Interns */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--primary)" /> My Interns
          </h3>
          {assignedInterns?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {assignedInterns.map(intern => {
                const progress = intern.totalTasksCount ? Math.round((intern.completedTasksCount / intern.totalTasksCount) * 100) : 0;
                return (
                  <div key={intern._id} style={{ padding: '12px 14px', background: 'var(--bg-card2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div className="flex-between mb-1">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{intern.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{intern.currentModule?.name || 'No module'}</div>
                      </div>
                      <span className="status-badge status-active">{intern.status}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{intern.completedTasksCount}/{intern.totalTasksCount} tasks ({progress}%)</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-icon"><Users size={48} opacity={0.3} /></div>
              <p>No interns assigned yet</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pending Reviews */}
          <div className="card">
            <div className="flex-between mb-2">
              <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={18} color="var(--warning)" /> Submissions to Review
              </h3>
              <Link to="/mentor/reviews" style={{ fontSize: 13, color: 'var(--primary-light)' }}>View all →</Link>
            </div>
            {pendingReviews?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingReviews.slice(0, 4).map(task => (
                  <div key={task._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card2)', borderRadius: 8, fontSize: 13 }}>
                    <div><div style={{ fontWeight: 600 }}>{task.title}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.intern?.name}</div></div>
                    <span className="status-badge status-submitted">submitted</span>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No pending submissions</p>}
          </div>

          {/* Today's Meetings */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={18} color="var(--info)" /> Today's Meetings
            </h3>
            {todayMeetings?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayMeetings.map(m => (
                  <div key={m._id} style={{ padding: '10px 12px', background: 'var(--bg-card2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.intern?.name}</div></div>
                    <div style={{ fontSize: 12, color: 'var(--primary-light)', fontWeight: 600 }}>
                      {new Date(m.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No meetings today</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
