// src/components/layout/AppLayout.jsx — Sidebar + Topbar wrapper
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import VoiceAssistant from '../VoiceAssistant/VoiceAssistant';
import {
  LayoutDashboard, Users, ClipboardList, Calendar, Mail, CheckSquare,
  Home, LogOut, Menu, ChevronRight, Sparkles
} from 'lucide-react';

const ADMIN_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard' },
  { label: 'Interns', icon: Users, to: '/admin/interns' },
  { label: 'Tasks', icon: ClipboardList, to: '/admin/tasks' },
  { label: 'Meetings', icon: Calendar, to: '/admin/meetings' },
  { label: 'Email Logs', icon: Mail, to: '/admin/email-logs' },
];
const MENTOR_NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/mentor/dashboard' },
  { label: 'Reviews', icon: CheckSquare, to: '/mentor/reviews' },
  { label: 'Tasks', icon: ClipboardList, to: '/mentor/tasks' },
  { label: 'Meetings', icon: Calendar, to: '/mentor/meetings' },
];
const INTERN_NAV = [
  { label: 'My Dashboard', icon: Home, to: '/intern/dashboard' },
  { label: 'My Tasks', icon: ClipboardList, to: '/intern/tasks' },
];

const NAV_MAP = { admin: ADMIN_NAV, mentor: MENTOR_NAV, intern: INTERN_NAV };

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = NAV_MAP[user?.role] || [];

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <div className="sidebar-logo-text">InternAI</div>
            <div className="sidebar-logo-sub">Coordinator Platform</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon"><Icon size={18} /></span>
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div className="user-pill" onClick={logout} title="Click to logout">
            <div className="user-avatar">{initials}</div>
            <div className="user-pill-info">
              <div className="user-pill-name">{user?.name}</div>
              <div className="user-pill-role">{user?.role} · Logout</div>
            </div>
            <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <div className="flex-gap">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'none', padding: 4 }}
              className="mobile-menu-btn"
            >
              <Menu size={22} />
            </button>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Welcome back, <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>
            </span>
          </div>
          <div className="flex-gap">
            <span className="status-badge status-active" style={{ fontSize: 11 }}>
              ● {user?.role}
            </span>
            <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{initials}</div>
          </div>
        </header>

        <main className="page-content animate-fade">
          <Outlet />
        </main>
      </div>

      {/* Voice Assistant (Intern only) */}
      {user?.role === 'intern' && <VoiceAssistant />}
    </div>
  );
}
