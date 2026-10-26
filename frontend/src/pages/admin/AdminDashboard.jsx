// src/pages/admin/AdminDashboard.jsx — Rich admin stats dashboard
import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import {
  Home, Users, ClipboardList, CheckCircle, Mail, Trophy, BarChart2,
  CalendarDays, Bell, Clock, UserCheck, Flag, Inbox
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const chartDefaults = {
  plugins: { legend: { labels: { color: '#a0a8c8', font: { family: 'Inter', size: 12 } } } },
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/admin').then(r => { setData(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p className="loading-text">Loading dashboard...</p></div>;
  if (!data) return <div className="alert alert-danger">Failed to load dashboard.</div>;

  const { interns, tasks, meetings, reviews, emails, recentFeedback, topInterns } = data;

  const taskChartData = {
    labels: ['Pending', 'Overdue', 'Completed'],
    datasets: [{ data: [tasks.pending, tasks.overdue, tasks.completed], backgroundColor: ['#6c63ff', '#ff6b6b', '#00d4aa'], borderWidth: 0 }],
  };

  const internChartData = {
    labels: topInterns?.map(i => i.name.split(' ')[0]) || [],
    datasets: [{
      label: 'Tasks Completed',
      data: topInterns?.map(i => i.completedTasksCount) || [],
      backgroundColor: 'rgba(108,99,255,0.7)',
      borderRadius: 6,
    }],
  };

  const statCards = [
    { label: 'Total Interns', value: interns.total, sub: `${interns.active} active`, Icon: Users, color: 'purple' },
    { label: 'Active Tasks', value: tasks.pending, sub: `${tasks.overdue} overdue`, Icon: ClipboardList, color: 'yellow' },
    { label: 'Completed Tasks', value: tasks.completed, sub: `of ${tasks.total} total`, Icon: CheckCircle, color: 'teal' },
    { label: 'Emails Today', value: emails.sentToday, sub: `${emails.failed} failed`, Icon: Mail, color: 'red' },
  ];

  const quickStatusItems = [
    { label: 'Reviews Pending Approval', value: reviews.pendingApproval, Icon: Clock, color: 'var(--warning)' },
    { label: 'Total Interns', value: interns.total, Icon: Users, color: 'var(--primary-light)' },
    { label: 'Interns Active', value: interns.active, Icon: UserCheck, color: 'var(--secondary)' },
    { label: 'Interns Completed', value: interns.completed, Icon: Flag, color: 'var(--info)' },
    { label: 'Emails Sent Today', value: emails.sentToday, Icon: Inbox, color: 'var(--primary-light)' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <p className="breadcrumb"><Home size={13} /> <span>Home</span> / Dashboard</p>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Overview of your entire internship program</p>
          </div>
          <div className="flex-gap">
            <div className="alert-mock" style={{ margin: 0, padding: '8px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={13} />
              Email: {process.env.MOCK_EMAIL !== 'false' ? 'MOCK mode active' : 'SMTP connected'}
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 mb-3">
        {statCards.map((s) => {
          const Icon = s.Icon;
          return (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.color}`}><Icon size={22} /></div>
              <div>
                <div className="stat-value">{s.value ?? '—'}</div>
                <div className="stat-label">{s.label}</div>
                <div className="text-xs text-muted mt-1">{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid-2 mb-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Top Interns Bar Chart */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy size={18} color="var(--warning)" /> Top Performers
          </h3>
          {topInterns?.length ? (
            <Bar data={internChartData} options={{
              ...chartDefaults,
              responsive: true,
              scales: {
                x: { ticks: { color: '#a0a8c8' }, grid: { color: '#2a2f4a' } },
                y: { ticks: { color: '#a0a8c8' }, grid: { color: '#2a2f4a' } },
              },
            }} />
          ) : <div className="empty-state"><div className="empty-state-icon"><BarChart2 size={48} opacity={0.3} /></div><p>No data yet</p></div>}
        </div>

        {/* Task Status Donut */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} color="var(--primary)" /> Task Status
          </h3>
          <Doughnut data={taskChartData} options={{ ...chartDefaults, cutout: '70%' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16, alignSelf: 'stretch' }}>
            {[['#6c63ff', 'Pending', tasks.pending], ['#ff6b6b', 'Overdue', tasks.overdue], ['#00d4aa', 'Completed', tasks.completed]].map(([color, label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  {label}
                </span>
                <strong>{val}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Meetings & Quick Stats */}
      <div className="grid-2">
        <div className="card">
          <div className="flex-between mb-2">
            <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={18} color="var(--info)" /> Today's Meetings
            </h3>
            <span className="status-badge status-scheduled">{meetings.today?.length || 0}</span>
          </div>
          {meetings.today?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meetings.today.map((m) => (
                <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card2)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {m.intern?.name} with {m.mentor?.name}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--primary-light)', fontWeight: 600 }}>
                    {new Date(m.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="empty-state-icon"><CalendarDays size={48} opacity={0.3} /></div>
              <p>No meetings today</p>
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            {meetings.upcomingCount} meetings in next 7 days
          </div>
        </div>

        {/* Quick Status */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} color="var(--accent)" /> Quick Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quickStatusItems.map((item) => {
              const Icon = item.Icon;
              return (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-card2)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={14} color={item.color} /> {item.label}
                  </span>
                  <strong style={{ color: item.color }}>{item.value ?? '—'}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
