// src/pages/Login.jsx — Animated premium login page
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bot, Eye, EyeOff, LogIn, Shield, GraduationCap, UserCog } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please enter email and password.'); return; }
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'mentor') navigate('/mentor/dashboard');
      else navigate('/intern/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (email, password) => { setEmail(email); setPassword(password); };

  const demoRoles = [
    { role: 'Admin', email: 'admin@company.com', password: 'Admin@1234', icon: UserCog, color: 'var(--primary-light)' },
    { role: 'Mentor', email: 'rajesh@company.com', password: 'Mentor@1234', icon: Shield, color: 'var(--secondary)' },
    { role: 'Intern', email: 'aarav@intern.com', password: 'Intern@1234', icon: GraduationCap, color: 'var(--warning)' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-dark)',
      backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(108,99,255,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0,212,170,0.08) 0%, transparent 50%)',
      padding: 20,
    }}>
      {/* Animated background orbs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {[{ top: '10%', left: '15%', size: 300, color: 'rgba(108,99,255,0.08)', delay: '0s' },
          { top: '60%', right: '10%', size: 250, color: 'rgba(0,212,170,0.06)', delay: '2s' },
          { bottom: '20%', left: '40%', size: 200, color: 'rgba(255,107,107,0.05)', delay: '4s' }
        ].map((orb, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            width: orb.size, height: orb.size,
            background: orb.color,
            filter: 'blur(60px)',
            ...orb,
            animation: `float ${6 + i}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(108,99,255,0.4)',
            animation: 'float 3s ease-in-out infinite alternate',
          }}>
            <Bot size={34} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
            <span className="text-gradient">InternAI</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>AI Voice-Based Intern Coordinator</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sign in to your account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Enter your credentials to continue</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }} disabled={loading}>
              {loading ? <><span className="spinner-sm spinner" /> Signing in...</> : <><LogIn size={16} /> Sign In</>}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Quick Demo Access
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {demoRoles.map((cred) => {
                const Icon = cred.icon;
                return (
                  <button
                    key={cred.role}
                    onClick={() => quickFill(cred.email, cred.password)}
                    style={{
                      background: 'var(--bg-card2)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '10px 6px', cursor: 'pointer', color: 'var(--text-secondary)',
                      fontSize: 12, textAlign: 'center', transition: 'var(--transition)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <Icon size={20} color={cred.color} />
                    <div style={{ fontWeight: 600 }}>{cred.role}</div>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
              Click a role to auto-fill · Run <code style={{ color: 'var(--primary-light)', background: 'rgba(108,99,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>npm run seed</code> first
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 20 }}>
          AI Intern Coordinator Platform · Built with care
        </p>
      </div>

      <style>{`@keyframes float { from { transform: translateY(0); } to { transform: translateY(-12px); } }`}</style>
    </div>
  );
}
