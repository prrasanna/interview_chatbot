// src/App.jsx — Root router with role-based route protection
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import AppLayout from './components/layout/AppLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import InternsPage from './pages/admin/InternsPage';
import TasksPage from './pages/admin/TasksPage';
import MeetingsPage from './pages/shared/MeetingsPage';
import EmailLogsPage from './pages/admin/EmailLogsPage';
import MentorDashboard from './pages/mentor/MentorDashboard';
import ReviewsPage from './pages/mentor/ReviewsPage';
import InternDashboard from './pages/intern/InternDashboard';
import InternTasksPage from './pages/intern/InternTasksPage';

// Protected route wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-overlay" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
      <p className="loading-text">Loading...</p>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
};

// Redirect from "/" to role-based dashboard
const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'mentor') return <Navigate to="/mentor/dashboard" replace />;
  return <Navigate to="/intern/dashboard" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e2235', color: '#f0f2ff', border: '1px solid #2a2f4a', borderRadius: '10px', fontSize: '14px' },
            success: { iconTheme: { primary: '#00d4aa', secondary: '#1e2235' } },
            error: { iconTheme: { primary: '#ff6b6b', secondary: '#1e2235' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AppLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="interns" element={<InternsPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="email-logs" element={<EmailLogsPage />} />
          </Route>

          {/* Mentor routes */}
          <Route path="/mentor" element={<ProtectedRoute roles={['mentor']}><AppLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<MentorDashboard />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="tasks" element={<TasksPage />} />
          </Route>

          {/* Intern routes */}
          <Route path="/intern" element={<ProtectedRoute roles={['intern']}><AppLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<InternDashboard />} />
            <Route path="tasks" element={<InternTasksPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
